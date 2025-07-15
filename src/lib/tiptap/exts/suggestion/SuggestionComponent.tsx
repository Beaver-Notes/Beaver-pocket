import { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import UiCard from "../../../../components/UI/Card";
import UiList from "../../../../components/UI/List";
import UiListItem from "../../../../components/UI/ListItem";
import { useTranslation } from "../../../../utils/translations";

interface SuggestionItem {
  [key: string]: any;
}

interface SuggestionComponentProps {
  onSelect: (data: { item: SuggestionItem; [key: string]: any }) => void;
  labelKey?: string;
  range?: object;
  onAdd?: (query: string, command: Function) => void;
  command: Function;
  editor?: object;
  query?: string;
  items?: SuggestionItem[];
  showAdd?: boolean;
}

interface SuggestionComponentHandle {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

const SuggestionComponent = forwardRef<
  SuggestionComponentHandle,
  SuggestionComponentProps
>(
  (
    {
      onSelect,
      labelKey = "",
      range = {},
      onAdd = () => {},
      command,
      editor = {},
      query = "",
      items = [],
      showAdd = false,
    },
    ref
  ) => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [translations, setTranslations] = useState<Record<string, any>>({
      menu: {},
    });

    useEffect(() => {
      const fetchTranslations = async () => {
        const trans = await useTranslation();
        if (trans) {
          setTranslations(trans);
        }
      };
      fetchTranslations();
    }, []);

    const getLabel = (item: SuggestionItem): string => {
      if (labelKey) {
        return item[labelKey];
      }
      return typeof item === "string" ? item : JSON.stringify(item);
    };

    const onKeyDown = ({ event }: { event: KeyboardEvent }): boolean => {
      switch (event.key) {
        case "ArrowUp":
          upHandler();
          return true;
        case "ArrowDown":
          downHandler();
          return true;
        case "Enter":
          enterHandler();
          return true;
        default:
          return false;
      }
    };

    const upHandler = () => {
      setSelectedIndex(
        (prevIndex) => (prevIndex + items.length - 1) % items.length
      );
    };

    const downHandler = () => {
      const itemsLength = items.length + (showAdd && query !== "" ? 1 : 0);
      setSelectedIndex((prevIndex) => (prevIndex + 1) % itemsLength);
    };

    const enterHandler = () => {
      selectItem(selectedIndex);
    };

    const selectItem = (index: number) => {
      const item = items[index];

      if (item) {
        onSelect({
          item,
          labelKey,
          range,
          onAdd,
          command,
          editor,
          query,
          items,
          showAdd,
        });
      } else if (showAdd && query !== "") {
        onAdd(query, command);
      }
    };

    useEffect(() => {
      setSelectedIndex(0);
    }, [items]);

    useImperativeHandle(ref, () => ({
      onKeyDown,
    }));

    return (
      <UiCard
        className="border max-w-xs"
        padding="p-2"
        style={{ maxWidth: "16rem", minWidth: "6rem" }}
      >
        <UiList className="cursor-pointer space-y-1">
          {items.length === 0 && query.length === 0 ? (
            <p className="text-center text-gray-500">
              {translations.menu.noData || "-"}
            </p>
          ) : (
            <>
              {items.map((item, index) => (
                <UiListItem
                  key={index}
                  className="label-item w-full text-overflow"
                  onClick={() => selectItem(index)}
                >
                  <p className="text-overflow truncate">
                    {getLabel(item) || translations.menu.noData}
                  </p>
                </UiListItem>
              ))}

              {showAdd && query.length !== 0 && (
                <UiListItem
                  className="label-item w-full text-overflow"
                  onClick={() => onAdd(query, command)}
                >
                  <span className="mr-2">+</span>
                  {translations.menu.Add || "-"} "
                  <strong className="text-overflow truncate">
                    {query.slice(0, 50)}
                  </strong>
                  "
                </UiListItem>
              )}
            </>
          )}
        </UiList>
      </UiCard>
    );
  }
);

SuggestionComponent.displayName = "SuggestionComponent";

export default SuggestionComponent;
