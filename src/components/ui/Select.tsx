// src/components/ui/Select.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "./Icon"; // your icon component (expects `name` + `className`)
import { IconName } from "@/lib/remixicon-react";

export interface SelectOption {
  value: string | number;
  text: string;
  disabled?: boolean;
}

export interface UiSelectProps {
  modelValue: string | number;
  onChange: (value: string | number) => void;
  label?: string;
  prependIcon?: string | JSX.Element; // string for Icon name or JSX element
  placeholder?: string;
  block?: boolean;
  search?: boolean;
  hidePlaceholderInDropdown?: boolean; // fixed name (was `hidee...` in Vue)
  options?: (string | SelectOption)[];
  pill?: boolean;
}

const UiSelect: React.FC<UiSelectProps> = ({
  modelValue,
  onChange,
  label,
  placeholder,
  prependIcon,
  block,
  search = false,
  hidePlaceholderInDropdown = false,
  options = [],
  pill = false,
}) => {
  const selectId = useMemo(
    () => `select-${Math.random().toString(36).slice(2, 11)}`,
    []
  );

  const selectButtonRef = useRef<HTMLButtonElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // store option DOM refs by index to scroll them into view
  const optionRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [searchQuery, setSearchQuery] = useState("");

  // normalize options
  const allOptions: SelectOption[] = useMemo(() => {
    return options.map((opt) =>
      typeof opt === "string"
        ? { value: opt, text: opt, disabled: false }
        : { disabled: false, ...opt }
    );
  }, [options]);

  const filteredOptions = useMemo(() => {
    if (!search || !searchQuery) return allOptions;
    const q = searchQuery.toLowerCase();
    return allOptions.filter((o) => o.text.toLowerCase().includes(q));
  }, [allOptions, search, searchQuery]);

  const selectedText = useMemo(() => {
    const found = allOptions.find(
      (o) => String(o.value) === String(modelValue)
    );
    return found?.text ?? "";
  }, [allOptions, modelValue]);

  const setOptionRef = (el: HTMLDivElement | null, index: number) => {
    optionRefs.current[index] = el;
  };

  // keep focused option visible
  useEffect(() => {
    if (!isOpen) return;
    if (focusedIndex < 0) return;
    const el = optionRefs.current[focusedIndex];
    if (el && el.scrollIntoView) {
      el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [focusedIndex, isOpen]);

  const toggle = () => {
    setIsOpen((prev) => {
      const next = !prev;
      if (next) {
        // opening
        setSearchQuery("");
        optionRefs.current = [];
        const currentIndex = filteredOptions.findIndex(
          (o) => String(o.value) === String(modelValue)
        );
        setFocusedIndex(Math.max(0, currentIndex));
        if (search) {
          // focus the search input on next tick
          setTimeout(() => searchInputRef.current?.focus(), 0);
        }
      } else {
        // closing
        optionRefs.current = [];
      }
      return next;
    });
  };

  const select = (option: SelectOption) => {
    if (option.disabled) return;
    onChange(option.value);
    setIsOpen(false);
    selectButtonRef.current?.focus();
  };

  const selectFocused = () => {
    const option = filteredOptions[focusedIndex];
    if (option && !option.disabled) select(option);
  };

  const moveFocus = (dir: number) => {
    const max = filteredOptions.length - 1;
    if (max < 0) return;
    let newIndex = focusedIndex + dir;
    if (newIndex < 0) newIndex = max;
    if (newIndex > max) newIndex = 0;

    let attempts = 0;
    while (
      filteredOptions[newIndex]?.disabled &&
      attempts < filteredOptions.length
    ) {
      newIndex += dir;
      if (newIndex < 0) newIndex = max;
      if (newIndex > max) newIndex = 0;
      attempts++;
    }
    setFocusedIndex(newIndex);
  };

  const handleKeydown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (!isOpen) {
      if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(e.key)) {
        e.preventDefault();
        toggle();
      }
      return;
    }
    switch (e.key) {
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        selectButtonRef.current?.focus();
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        selectFocused();
        break;
      case "ArrowDown":
        e.preventDefault();
        moveFocus(1);
        break;
      case "ArrowUp":
        e.preventDefault();
        moveFocus(-1);
        break;
    }
  };

  const handleSearchKeydown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        moveFocus(1);
        break;
      case "ArrowUp":
        e.preventDefault();
        moveFocus(-1);
        break;
      case "Enter":
        e.preventDefault();
        selectFocused();
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        selectButtonRef.current?.focus();
        break;
    }
  };

  const handleBlur = () => {
    // small delay to allow clicks inside the dropdown
    setTimeout(() => {
      const active = document.activeElement;
      if (
        dropdownRef.current &&
        active &&
        dropdownRef.current.contains(active)
      ) {
        return; // focus is still inside the dropdown
      }
      setIsOpen(false);
    }, 150);
  };

  const handleClickOutside = (e: MouseEvent) => {
    const target = e.target as Node;
    const btn = selectButtonRef.current;
    const dd = dropdownRef.current;
    if (btn && btn.contains(target)) return;
    if (dd && dd.contains(target)) return;
    setIsOpen(false);
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div
      className={`ui-select cursor-pointer rtl:-rotate-180 ${
        !block ? "inline-block" : ""
      }`}
    >
      {label && (
        <label htmlFor={selectId} className="text-neutral-200 text-sm ml-2">
          {label}
        </label>
      )}

      <div className={`ui-select__content flex items-center w-full block transition bg-neutral-50 dark:bg-neutral-750 ${pill ? "rounded-full" : "rounded-lg"} appearance-none focus:outline-none relative`}>
        {!!prependIcon && (
          <span className="absolute text-neutral-600 dark:text-neutral-200 left-0 ml-2">
            {typeof prependIcon === "string" ? (
              <Icon name={prependIcon as IconName} className="" />
            ) : (
              prependIcon
            )}
          </span>
        )}

        {/* Button */}
        <button
          id={selectId}
          ref={selectButtonRef}
          className={`px-4 rtl:rotate-180 pr-8 bg-transparent py-2 z-10 w-full h-full text-left focus:outline-none ${
            prependIcon ? "pl-8" : ""
          }`}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          onClick={toggle}
          onKeyDown={handleKeydown}
          onBlur={handleBlur}
          aria-labelledby={label ? `${selectId}-label` : undefined}
        >
          {selectedText ? (
            <span className="block truncate">{selectedText}</span>
          ) : placeholder ? (
            <span className="block truncate text-neutral-500">
              {placeholder}
            </span>
          ) : null}
        </button>

        {/* Dropdown Arrow */}
        <Icon
          name="ArrowDownSLine"
          className={`absolute text-neutral-600 dark:text-neutral-200 mr-2 right-0 rtl:right-auto rtl:left-0 transition-transform duration-200 pointer-events-none ${
            isOpen ? "rotate-180" : ""
          }`}
        />

        {/* Dropdown */}
        <div
          ref={dropdownRef}
          className={`absolute top-full left-0 right-0 mt-1 bg-neutral-100 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-lg shadow-lg z-50 max-h-60 overflow-hidden transform transition-all duration-200 ease-out origin-top ${
            isOpen
              ? "opacity-100 scale-100"
              : "opacity-0 scale-95 pointer-events-none"
          }`}
          role="listbox"
          aria-activedescendant={
            focusedIndex >= 0 ? `${selectId}-opt-${focusedIndex}` : undefined
          }
        >
          {/* Search Input */}
          {search && (
            <div className="p-2 border-b border-neutral-300 dark:border-neutral-600">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeydown}
                placeholder="Search options..."
                className="w-full p-1 rounded text-sm focus:outline-none bg-transparent"
              />
            </div>
          )}

          {/* Options */}
          <div className="max-h-48 overflow-y-auto">
            {/* Placeholder Option */}
            {placeholder && !hidePlaceholderInDropdown && (
              <div
                id={`${selectId}-placeholder`}
                onClick={() => select({ value: "", text: placeholder })}
                className={`px-4 py-2 hover:bg-neutral-200 dark:hover:bg-neutral-600 cursor-pointer text-neutral-500 ${
                  modelValue === "" ? "bg-neutral-200 dark:bg-neutral-600" : ""
                }`}
                role="option"
                aria-selected={modelValue === ""}
              >
                {placeholder}
              </div>
            )}

            {/* Filtered Options */}
            {filteredOptions.map((option, index) => (
              <div
                id={`${selectId}-opt-${index}`}
                key={`${option.value}-${index}`}
                ref={(el) => setOptionRef(el, index)}
                onClick={() => select(option)}
                className={`px-4 py-2 hover:bg-secondary hover:bg-opacity-20 cursor-pointer transition-colors
                  ${
                    String(option.value) === String(modelValue)
                      ? "bg-neutral-100 dark:bg-neutral-700"
                      : ""
                  }
                  ${option.disabled ? "opacity-50 cursor-not-allowed" : ""}
                  ${
                    index === focusedIndex && !option.disabled
                      ? "bg-secondary bg-opacity-20"
                      : ""
                  }
                `}
                role="option"
                aria-selected={String(option.value) === String(modelValue)}
              >
                {option.text}
              </div>
            ))}

            {/* No Results */}
            {search && searchQuery && filteredOptions.length === 0 && (
              <div className="px-4 py-2 text-neutral-500 text-center">
                No options found
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UiSelect;
