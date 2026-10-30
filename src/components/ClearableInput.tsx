import { forwardRef, useRef } from "react";
import { X } from "lucide-react";

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  onClear?: () => void;
};

/** Input com botão X para limpar quando há texto. */
export const ClearableInput = forwardRef<HTMLInputElement, Props>(function ClearableInput(
  { className = "", value, onChange, onClear, ...rest },
  ref,
) {
  const internal = useRef<HTMLInputElement>(null);
  const setRef = (el: HTMLInputElement | null) => {
    internal.current = el;
    if (typeof ref === "function") ref(el);
    else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = el;
  };
  const has = value != null && String(value).length > 0;

  function clear() {
    if (onClear) onClear();
    else if (onChange) {
      const ev = { target: { value: "" } } as unknown as React.ChangeEvent<HTMLInputElement>;
      onChange(ev);
    }
    internal.current?.focus();
  }

  return (
    <div className="relative">
      <input
        {...rest}
        ref={setRef}
        value={value}
        onChange={onChange}
        className={`${className} ${has ? "pr-9" : ""}`}
      />
      {has && (
        <button
          type="button"
          onClick={clear}
          aria-label="Limpar campo"
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
});
