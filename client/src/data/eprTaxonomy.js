export const EPR_TAXONOMY = {
  Plastic: {
    classificationLabel: "Plastic Category",
    classificationType: "plastic_category",
    options: [
      { value: "Category I", label: "Category I — Rigid Plastic Packaging" },
      { value: "Category II", label: "Category II — Flexible Plastic Packaging" },
      { value: "Category III", label: "Category III — Multilayered Plastic Packaging" },
      { value: "Category IV", label: "Category IV — Compostable Plastic Packaging" },
    ],
  },
  "E-Waste": {
    classificationLabel: "EEE Category",
    classificationType: "eee_category",
    options: [
      { value: "ITEW", label: "ITEW — Information Technology & Telecommunication Equipment (27 items)" },
      { value: "CEEW", label: "CEEW — Consumer Electrical & Electronics and Photovoltaic Panels (19 items)" },
      { value: "LSEEW", label: "LSEEW — Large & Small Electrical and Electronic Equipment (34 items)" },
      { value: "EETW", label: "EETW — Electrical & Electronic Tools (8 items)" },
      { value: "TLSEW", label: "TLSEW — Toys, Leisure & Sports Equipment (6 items)" },
      { value: "MDW", label: "MDW — Medical Devices (10 items)" },
      { value: "LIW", label: "LIW — Laboratory Instruments (2 items)" },
    ],
    codeLabel: "EEE Item Code",
    codePlaceholder: "e.g. ITEW3",
    codeHelp: "Use the CPCB EEE item code when the certificate is item-code specific.",
  },
  Battery: {
    classificationLabel: "Battery Type",
    classificationType: "battery_type",
    options: [
      { value: "Portable", label: "Portable Battery" },
      { value: "Automotive", label: "Automotive Battery" },
      { value: "Electric Vehicle", label: "Electric Vehicle Battery" },
      { value: "Industrial", label: "Industrial Battery" },
    ],
  },
  Tyre: {
    classificationLabel: "Certificate / Product Type",
    classificationType: "tyre_certificate_type",
    options: [
      { value: "Reclaimed Rubber", label: "Reclaimed Rubber" },
      { value: "Crumb Rubber", label: "Crumb Rubber" },
      { value: "CRMB", label: "Crumb Rubber Modified Bitumen (CRMB)" },
      { value: "Recovered Carbon Black", label: "Recovered Carbon Black" },
      { value: "Pyrolysis Oil or Char", label: "Pyrolysis Oil or Char" },
      { value: "Retreading", label: "Retreading Certificate" },
    ],
  },
  "Used Oil": {
    classificationLabel: "Oil Type",
    classificationType: "used_oil_type",
    options: [
      "Virgin Base Oil", "White Oil", "Hydraulic Oil", "Transformer Oil", "Cutting Oil",
      "Rubber Processing Oil", "Thermal Fluids", "Anti-Rust Oil", "General Purpose Lubrication Oil",
      "Engine Oil", "Brake Oil", "Grease", "Re-Refined / Recycled Base Oil", "Gear Oil",
      "Turbine Oil", "Compressor Oil",
    ].map((value) => ({ value, label: value })),
  },
  ELV: {
    classificationLabel: "Vehicle Classification",
    classificationType: "elv_vehicle_type",
    options: [
      { value: "Two Wheeler", label: "Two Wheeler" },
      { value: "Three Wheeler", label: "Three Wheeler" },
      { value: "Four Wheeler", label: "Four Wheeler" },
      { value: "Other Motor Vehicle", label: "Other Motor Vehicle" },
    ],
  },
};

export const getEprTaxonomy = (type) => EPR_TAXONOMY[type] || null;
export const EPR_CLASSIFICATION_TYPES = Object.values(EPR_TAXONOMY).map((item) => item.classificationType);
