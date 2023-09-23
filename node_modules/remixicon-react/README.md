# remixicon-react [![npm package](https://img.shields.io/npm/v/remixicon-react.svg?style=flat-square)](https://npmjs.org/package/remixicon-react) [![Remix Icons version](https://img.shields.io/badge/remixicon-v2.4.0-blue.svg?style=flat-square)](https://remixicon.com/) [![build status](https://img.shields.io/travis/bayesimpact/remixicon-react/master.svg?style=flat-square)](https://travis-ci.org/bayesimpact/remixicon-react)
[Remix Icons](https://remixicon.com/) for React packaged as single components

This repo is based on the very good [mdi-react](https://github.com/levrik/mdi-react) package.

## Installation

```bash
npm install remixicon-react
# or if you use Yarn
yarn add remixicon-react
```

## Usage

Just search for an icon on [remixicon.com](https://remixicon.com) and look for its name.  
The name translates to PascalCase followed by the suffix `Icon` in `remixicon-react`.  

For example the icons named `alert-line` and `alert-fill`:

```javascript
import AlertLineIcon from 'remixicon-react/AlertLineIcon';
import AlertFillIcon from 'remixicon-react/AlertFillIcon';

const MyComponent = () => {
  return (
    <div>
      {/* The default color is the current text color (currentColor) */}
      <AlertLineIcon color="#fff" />
      {/* The default size is 24 */}
      <AlertFillIcon className="some-class" size={16} />
      {/* This sets the icon size to the current font size */}
      <AlertIcon size="1em" />
    </div>
  );
};
```

To change the color on hover you can just use your own class and plain CSS.

```css
.some-class:hover {
  fill: red;
}
```

You can also add default styling via the `remixicon-icon` class.

```css
.remixicon-icon {
  background-color: green;
}
```
