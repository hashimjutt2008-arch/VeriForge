import { Layers2 } from "lucide-react";
export function Brand() {
  return (
    <span className="brand">
      <span className="brand-mark">
        <Layers2 size={23} strokeWidth={2.1} />
      </span>
      VeriForge<span className="brand-period">.</span>
    </span>
  );
}
