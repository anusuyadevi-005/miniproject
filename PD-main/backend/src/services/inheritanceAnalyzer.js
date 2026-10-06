export function calculateInheritance(symbolData) {
  const inheritance = [];
  const classes = symbolData.classes || [];

  for (const cls of classes) {
    if (cls.parentClass) {
      inheritance.push({
        class: cls.name,
        parentClass: cls.parentClass,
        type: 'extends'
      });
    }
    if (cls.implementedInterfaces?.length) {
      inheritance.push({
        class: cls.name,
        interfaces: cls.implementedInterfaces,
        type: 'implements'
      });
    }
  }

  return inheritance;
}
