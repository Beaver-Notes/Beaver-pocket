"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = wrapFunction;
var _helperFunctionName = require("@babel/helper-function-name");
var _template = require("@babel/template");
var _t = require("@babel/types");
const {
  blockStatement,
  callExpression,
  functionExpression,
  isAssignmentPattern,
  isFunctionDeclaration,
  isRestElement,
  returnStatement,
  isCallExpression,
  cloneNode,
  toExpression
} = _t;
const buildWrapper = _template.default.statement(`
  function NAME(PARAMS) {
    return (REF = REF || FUNCTION).apply(this, arguments);
  }
`);
function classOrObjectMethod(path, callId) {
  const node = path.node;
  const body = node.body;
  const container = functionExpression(null, [], blockStatement(body.body), true);
  body.body = [returnStatement(callExpression(callExpression(callId, [container]), []))];
  node.async = false;
  node.generator = false;
  path.get("body.body.0.argument.callee.arguments.0").unwrapFunctionEnvironment();
}
function plainFunction(inPath, callId, noNewArrows, ignoreFunctionLength) {
  let path = inPath;
  let node;
  let functionId = null;
  const nodeParams = inPath.node.params;
  if (path.isArrowFunctionExpression()) {
    {
      var _path$arrowFunctionTo;
      path = (_path$arrowFunctionTo = path.arrowFunctionToExpression({
        noNewArrows
      })) != null ? _path$arrowFunctionTo : path;
    }
    node = path.node;
  } else {
    node = path.node;
  }
  const isDeclaration = isFunctionDeclaration(node);
  let built = node;
  if (!isCallExpression(node)) {
    functionId = node.id;
    node.id = null;
    node.type = "FunctionExpression";
    built = callExpression(callId, [node]);
  }
  const params = [];
  for (const param of nodeParams) {
    if (isAssignmentPattern(param) || isRestElement(param)) {
      break;
    }
    params.push(path.scope.generateUidIdentifier("x"));
  }
  const ref = path.scope.generateUidIdentifier(functionId ? functionId.name : "ref");
  let wrapper = buildWrapper({
    NAME: functionId,
    REF: ref,
    FUNCTION: built,
    PARAMS: params
  });
  if (!isDeclaration) {
    wrapper = toExpression(wrapper);
    (0, _helperFunctionName.default)({
      node: wrapper,
      parent: path.parent,
      scope: path.scope
    });
  }
  if (isDeclaration || wrapper.id || !ignoreFunctionLength && params.length) {
    path.replaceWith(wrapper);
    path.parentPath.scope.push({
      id: cloneNode(ref)
    });
  } else {
    path.replaceWith(built);
  }
}
function wrapFunction(path, callId, noNewArrows = true, ignoreFunctionLength = false) {
  if (path.isMethod()) {
    classOrObjectMethod(path, callId);
  } else {
    plainFunction(path, callId, noNewArrows, ignoreFunctionLength);
  }
}

//# sourceMappingURL=index.js.map
