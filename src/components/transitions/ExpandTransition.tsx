import React, {
  ReactNode,
  ReactElement,
  Children,
  cloneElement,
  useRef,
} from "react";
import { CSSTransition, TransitionGroup } from "react-transition-group";
import { CSSTransitionProps } from "react-transition-group/CSSTransition";
import "./css/ExpandTransition.css";

type ExpandTransitionProps = {
  group?: boolean;
  children: ReactNode;
} & Omit<CSSTransitionProps, "children">;

const ExpandTransition: React.FC<ExpandTransitionProps> = ({
  group = false,
  children,
  ...rest
}) => {
  const onEnter = (node: HTMLElement) => {
    const { width } = getComputedStyle(node);

    node.style.width = width;
    node.style.position = "absolute";
    node.style.visibility = "hidden";
    node.style.height = "auto";

    const { height } = getComputedStyle(node);

    node.style.width = "";
    node.style.position = "";
    node.style.visibility = "";
    node.style.height = "0px";

    // Force reflow
    void node.offsetHeight;

    requestAnimationFrame(() => {
      node.style.height = height;
    });
  };

  const onEntered = (node: HTMLElement) => {
    node.style.height = "auto";
  };

  const onExit = (node: HTMLElement) => {
    const { height } = getComputedStyle(node);
    node.style.height = height;

    // Force reflow
    void node.offsetHeight;

    requestAnimationFrame(() => {
      node.style.height = "0px";
    });
  };

  const renderChild = (child: ReactNode, index: number) => {
    if (!React.isValidElement(child)) return null;

    return (
      <CSSTransition
        key={(child.key as string) ?? index}
        timeout={200}
        classNames="expand"
        onEnter={onEnter}
        onEntered={onEntered}
        onExit={onExit}
        {...rest}
      >
        {cloneElement(child as ReactElement, {
          ref: useRef(null),
        })}
      </CSSTransition>
    );
  };

  if (group) {
    return (
      <TransitionGroup component={null}>
        {Children.map(children, renderChild)}
      </TransitionGroup>
    );
  }

  // Single child mode
  const onlyChild = Children.only(children);
  return renderChild(onlyChild, 0);
};

export default ExpandTransition;
