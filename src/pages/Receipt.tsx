// Page 4: Receipt page with thank you message
import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface MemoryState {
  memory?: any;
  text?: string;
  audioUrl?: string | null;
}

export default function Receipt() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as MemoryState;
  const [showContent, setShowContent] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Animate content appearing
    setTimeout(() => setShowContent(true), 300);
  }, []);

  // Auto-navigate back to start after 10 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/');
    }, 10000);

    return () => clearTimeout(timer);
  }, [navigate]);

  // Print receipt function (for receipt printer integration)
  const handlePrintReceipt = () => {
    if (receiptRef.current) {
      const printContent = receiptRef.current.innerHTML;
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Time Machine Receipt</title>
              <style>
                @media print {
                  body { 
                    font-family: 'Courier New', monospace;
                    font-size: 12px;
                    padding: 20px;
                    max-width: 300px;
                    margin: 0 auto;
                  }
                  .receipt-content {
                    border: 2px dashed #000;
                    padding: 20px;
                  }
                  .header { text-align: center; margin-bottom: 20px; }
                  .divider { border-top: 1px dashed #000; margin: 15px 0; }
                  .footer { text-align: center; margin-top: 20px; font-size: 10px; }
                }
              </style>
            </head>
            <body>
              ${printContent}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  return (
    <div className="relative w-full h-screen bg-black text-green-400 font-mono flex items-center justify-center">
      {/* Terminal header */}
      <div className="absolute top-0 left-0 right-0 bg-black/90 border-b border-green-400/30 px-4 py-2 z-10">
        <div className="font-mono text-xs text-green-400/70">
          TIME_MACHINE.EXE v2.0 | STATUS: MEMORY SAVED | {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Main content */}
      <div className={`text-center transition-opacity duration-1000 ${showContent ? 'opacity-100' : 'opacity-0'}`}>
        {/* Thank you message */}
        <div className="mb-8">
          <div className="text-5xl md:text-7xl font-mono text-green-400 mb-4 animate-pulse">
            THANK YOU
          </div>
          <div className="text-2xl md:text-4xl font-mono text-green-400/70">
            FOR YOUR TIME
          </div>
        </div>

        {/* Receipt preview */}
        {state?.memory && (
          <div 
            ref={receiptRef}
            className="max-w-md mx-auto bg-black border-2 border-green-400/50 p-6 mt-8 text-left"
          >
            <div className="receipt-content">
              {/* Receipt header */}
              <div className="header border-b border-green-400/30 pb-2 mb-4">
                <div className="text-2xl font-mono text-green-400 text-center">
                  TIME MACHINE
                </div>
                <div className="text-xs text-green-400/70 text-center mt-1">
                  Memory Receipt
                </div>
                <div className="text-xs text-green-400/50 text-center mt-1">
                  {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
                </div>
              </div>

              {/* Receipt content */}
              <div className="space-y-2 text-sm">
                <div className="divider"></div>
                <div>
                  <span className="text-green-400/70">Location:</span>
                  <div className="text-green-400 ml-2">
                    {state.memory.place_name || 'Unknown'}
                  </div>
                  <div className="text-green-400/50 text-xs ml-2">
                    ({state.memory.lat?.toFixed(4)}, {state.memory.lng?.toFixed(4)})
                  </div>
                </div>
                
                <div className="divider"></div>
                
                <div>
                  <span className="text-green-400/70">Memory:</span>
                  <div className="text-green-400 ml-2 mt-1 whitespace-pre-wrap">
                    {state.text || '[Voice memo recorded]'}
                  </div>
                </div>

                {state.audioUrl && (
                  <>
                    <div className="divider"></div>
                    <div>
                      <span className="text-green-400/70">Audio:</span>
                      <div className="text-green-400/50 text-xs ml-2">
                        ✓ Recorded
                      </div>
                    </div>
                  </>
                )}

                <div className="divider"></div>
                <div className="text-green-400/50 text-xs">
                  ID: {state.memory.id?.substring(0, 8)}...
                </div>
              </div>

              {/* Receipt footer */}
              <div className="footer border-t border-green-400/30 pt-4 mt-4">
                <div className="text-green-400/70 text-xs text-center">
                  Your memory has been saved to the Time Machine
                </div>
                <div className="text-green-400/50 text-xs text-center mt-2">
                  Thank you for contributing
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Print button */}
        <div className="mt-8">
          <button
            onClick={handlePrintReceipt}
            className="px-6 py-3 border-2 border-green-400 text-green-400 font-mono hover:bg-green-400 hover:text-black transition-all cursor-pointer"
            type="button"
          >
            [PRINT RECEIPT]
          </button>
          <div className="text-green-400/40 text-xs mt-2 font-mono">
            &gt; Connect receipt printer to enable printing
          </div>
        </div>

        {/* Return message */}
        <div className="mt-8 text-green-400/50 text-sm">
          &gt; Returning to start in a few seconds...
        </div>
      </div>
    </div>
  );
}

