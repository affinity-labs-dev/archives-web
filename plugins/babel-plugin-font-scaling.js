/**
 * Babel plugin to disable system font scaling globally (AFF-331).
 * Adds allowFontScaling={false} to all <Text> and <TextInput> components at compile time.
 * Works with New Architecture (Fabric) where defaultProps and render patching don't work.
 *
 * Example transformation:
 *   <Text>Hello</Text> → <Text allowFontScaling={false}>Hello</Text>
 *   <TextInput placeholder="..." /> → <TextInput allowFontScaling={false} placeholder="..." />
 *
 * Components that explicitly set allowFontScaling={true} will not be overridden.
 */
module.exports = function ({ types: t }) {
  return {
    name: 'disable-font-scaling',
    visitor: {
      JSXOpeningElement(path) {
        const name = path.node.name.name;

        if (name === 'Text' || name === 'TextInput') {
          const hasAllowFontScaling = path.node.attributes.some(
            (attr) => attr.name && attr.name.name === 'allowFontScaling',
          );

          if (!hasAllowFontScaling) {
            const attribute = t.jSXAttribute(
              t.jSXIdentifier('allowFontScaling'),
              t.jSXExpressionContainer(t.booleanLiteral(false)),
            );
            path.node.attributes.push(attribute);
          }
        }
      },
    },
  };
};
