import React, {
  useEffect,
  useRef,
  useCallback,
  ChangeEvent,
  KeyboardEvent,
  useState,
} from "react";
import Icon from "./Icon";

type IconName = React.ComponentProps<typeof Icon>["name"];

type InputUIProps = {
  value: string;
  onChange: (val: string) => void;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
  label?: string;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  readonly?: boolean;
  autofocus?: boolean;
  clearable?: boolean;
  prependIcon?: IconName;
  password?: boolean;
  modifiers?: {
    lowercase?: boolean;
  };
};

const UiInput: React.FC<InputUIProps> = ({
  value,
  onChange,
  onKeyDown,
  label,
  placeholder = "",
  type = "text",
  disabled = false,
  readonly = false,
  autofocus = false,
  clearable = false,
  prependIcon,
  password = false,
  modifiers = {},
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [visible, setVisible] = useState(false);

  const showClear = clearable && value;
  const showToggle = password;
  const hasRightButtons = showClear || showToggle;

  const inputType = password ? (visible ? "text" : "password") : type;

  useEffect(() => {
    if (autofocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autofocus]);

  const emitValue = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      let val = e.target.value;
      if (modifiers.lowercase) {
        val = val.toLowerCase();
      }
      onChange(val);
    },
    [onChange, modifiers]
  );

  const clearInput = () => {
    onChange("");
  };

  return (
    <div className="inline-block input-ui w-full">
      <label className="relative w-full block">
        {label && (
          <span className="text-sm dark:text-neutral-200 text-neutral-600 mb-1 ml-1 block">
            {label}
          </span>
        )}
        <div className="flex items-center relative w-full">
          {prependIcon && (
            <Icon
              name={prependIcon}
              className="ml-2 dark:text-neutral-200 text-neutral-600 absolute left-0"
            />
          )}

          <input
            ref={inputRef}
            readOnly={disabled || readonly}
            placeholder={placeholder}
            type={inputType}
            value={value}
            onKeyDown={onKeyDown}
            onChange={emitValue}
            className={`py-2 px-4 rounded-lg w-full bg-input bg-transparent transition ring-2 ring-secondary ${
              disabled ? "opacity-75 pointer-events-none" : ""
            } ${prependIcon ? "pl-10" : ""} ${hasRightButtons ? "pr-24" : ""}`}
          />

          {hasRightButtons && (
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
              {password && (
                <button
                  type="button"
                  onClick={() => setVisible((v) => !v)}
                  className="text-sm"
                >
                  {visible ? (
                    <Icon name="EyeLine" className="text-secondary" />
                  ) : (
                    <Icon name="EyeCloseLine" className="text-secondary" />
                  )}
                </button>
              )}
              {showClear && (
                <button
                  type="button"
                  onClick={clearInput}
                  className="text-neutral-600 dark:text-neutral-200"
                >
                  <Icon name="DeleteBackLine" className="text-2xl" />
                </button>
              )}
            </div>
          )}
        </div>
      </label>
    </div>
  );
};

export default UiInput;
