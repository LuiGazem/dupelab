import { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";

const modalStyles = `
  .scanner-overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px}
  .scanner-modal{background:#fff;border-radius:20px;padding:24px;max-width:480px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.3)}
  .scanner-modal-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}
  .scanner-modal-title{font-family:'DM Serif Display',serif;font-size:20px;color:#1a1a2e}
  .scanner-close{background:none;border:none;font-size:22px;cursor:pointer;color:#8892a4;line-height:1;padding:4px}
  .scanner-close:hover{color:#1a1a2e}
  #html5qr-scanner div{border-radius:12px;overflow:hidden}
  .scanner-status{margin-top:14px;font-size:13px;text-align:center;min-height:20px;color:#8892a4}
  .scanner-status.error{color:#c0392b}
  .scanner-status.success{color:#27ae60;font-weight:600}
  .scanner-toast{background:#1a1a2e;color:#faf7f2;border-radius:12px;padding:12px 16px;margin-top:14px;font-size:13px;line-height:1.5;display:none}
  .scanner-toast.visible{display:block}
`;

async function lookupBarcode(barcode) {
  const res = await fetch(`https://world.openbeautyfacts.org/product/${barcode}.json`);
  const data = await res.json();
  if (data.status === 1 && data.product?.ingredients_text) {
    const ingredients = data.product.ingredients_text
      .split(/[,;]/)
      .map(i => i.trim())
      .filter(i => i.length > 1);
    return { ingredients, name: data.product.product_name, brand: data.product.brands };
  }
  return null;
}

export default function BarcodeScanner({ onClose, onIngredientsFound }) {
  const scannerRef = useRef(null);
  const [status, setStatus] = useState("Point your camera at a product barcode");
  const [statusType, setStatusType] = useState("");
  const [toast, setToast] = useState(null);
  const hasScanned = useRef(false);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "html5qr-scanner",
      {
        fps: 10,
        qrbox: { width: 280, height: 140 },
        formatsToSupport: [
          0,  // QR_CODE
          1,  // AZTEC
          2,  // CODABAR
          3,  // CODE_39
          4,  // CODE_93
          5,  // CODE_128
          6,  // DATA_MATRIX
          7,  // MAXICODE
          8,  // ITF
          9,  // EAN_13
          10, // EAN_8
          11, // PDF_417
          12, // RSS_14
          13, // RSS_EXPANDED
          14, // UPC_A
          15, // UPC_E
          16, // UPC_EAN_EXTENSION
        ],
        rememberLastUsedCamera: true,
        aspectRatio: 1.5,
        videoConstraints: { facingMode: "environment" },
      },
      false
    );

    scanner.render(
      async (decodedText) => {
        if (hasScanned.current) return;
        hasScanned.current = true;
        setStatus("Barcode detected! Looking up product...");
        setStatusType("");
        try {
          const result = await lookupBarcode(decodedText);
          if (result && result.ingredients.length > 0) {
            setStatus(`Found! ${result.ingredients.length} ingredients loaded.`);
            setStatusType("success");
            setToast(`${result.name || "Product"}${result.brand ? ` · ${result.brand}` : ""}\n${result.ingredients.length} ingredients auto-filled`);
            onIngredientsFound(result.ingredients.join(", "));
            setTimeout(() => onClose(), 2000);
          } else {
            setStatus("Product not found — try pasting ingredients manually");
            setStatusType("error");
            hasScanned.current = false;
          }
        } catch {
          setStatus("Lookup failed — check your connection and try again");
          setStatusType("error");
          hasScanned.current = false;
        }
      },
      () => {}
    );

    scannerRef.current = scanner;
    return () => {
      scanner.clear().catch(() => {});
    };
  }, []);

  return (
    <>
      <style>{modalStyles}</style>
      <div className="scanner-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="scanner-modal">
          <div className="scanner-modal-header">
            <div className="scanner-modal-title">📷 Scan Product Barcode</div>
            <button className="scanner-close" onClick={onClose}>✕</button>
          </div>
          <div id="html5qr-scanner" />
          <div className={`scanner-status ${statusType}`}>{status}</div>
          {toast && <div className={`scanner-toast visible`}>{toast}</div>}
        </div>
      </div>
    </>
  );
}
