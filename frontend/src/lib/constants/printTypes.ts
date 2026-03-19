export const PRINT_TYPES = [
  {
    key: "dd",
    label: "DD",
    methods: [
      { key: "atlas_max", label: "Atlas Max" },
      { key: "brother_gtx", label: "Brother GTX" },
    ],
  },
  {
    key: "dtf",
    label: "DTF",
    methods: [
      { key: "prestige", label: "Prestige" },
      { key: "mimaki", label: "Mimaki" },
    ],
  },
  {
    key: "flex",
    label: "Flex",
    methods: [
      { key: "standard_flex", label: "Standard Flex" },
      { key: "turbo_flex", label: "Turbo Flex" },
      { key: "blockout", label: "Blockout" },
    ],
  },
  {
    key: "emb",
    label: "EMB",
    methods: [{ key: "tajima", label: "Tajima" }],
  },
  {
    key: "uv_sub",
    label: "UV/Sub",
    methods: [
      { key: "ids_360t", label: "IDS 360 T (UV)" },
      { key: "schulze", label: "Schulze press" },
    ],
  },
  {
    key: "washing",
    label: "Washing",
    methods: [{ key: "washing", label: "Washing" }],
  },
  {
    key: "dish_washer",
    label: "Dish Washer",
    methods: [{ key: "dish_washer", label: "Dish Washer" }],
  },
] as const;

type Method = (typeof PRINT_TYPES)[number]["methods"][number];

export const ALL_METHODS = PRINT_TYPES.flatMap((pt) => [
  ...pt.methods,
]) as readonly Method[];

export const METHOD_TO_TYPE: Record<string, string> = Object.fromEntries(
  PRINT_TYPES.flatMap((pt) => pt.methods.map((m) => [m.key, pt.label])),
);

export const METHOD_TO_TYPE_KEY: Record<string, string> = Object.fromEntries(
  PRINT_TYPES.flatMap((pt) => pt.methods.map((m) => [m.key, pt.key])),
);
