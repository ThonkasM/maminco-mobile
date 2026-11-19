export const Platform = {
  OS: 'ios',
  select: <T>(spec: { default?: T; ios?: T; android?: T }): T | undefined =>
    spec.ios ?? spec.default,
};
