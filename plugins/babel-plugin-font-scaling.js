/**
 * Babel plugin to disable system font scaling globally (AFF-331).
 * Adds allowFontScaling={false} to all <Text> and <TextInput> components at compile time.
 * Works with New Architecture (Fabric) where defaultProps and render patching don't work.
 *
 * Example transformations:
 *   <Text>Hello</Text>           → <Text allowFontScaling={false}>Hello</Text>
 *   <Animated.Text>Hi</Animated.Text> → <Animated.Text allowFontScaling={false}>Hi</Animated.Text>
 *   <TextInput placeholder="..." />   → <TextInput allowFontScaling={false} placeholder="..." />
 *
 * Components that explicitly set allowFontScaling={true} will not be overridden.
 */
module.exports = function ({ types: t }) {
  return {
    name: 'disable-font-scaling',
    visitor: {
      JSXOpeningElement(path) {
        const node = path.node.name;
        let name;

        // <Text> or <TextInput> — JSXIdentifier
        if (node.type === 'JSXIdentifier') {
          name = node.name;
        // <Animated.Text> or <Animated.TextInput> — JSXMemberExpression
        } else if (node.type === 'JSXMemberExpression') {
          name = node.property.name;
        }

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
