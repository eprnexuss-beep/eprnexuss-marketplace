export const EPR_TAXONOMY = {
  Plastic: {
    classificationType: "plastic_category",
    options: ["Category I", "Category II", "Category III", "Category IV"],
  },
  "E-Waste": {
    classificationType: "eee_category",
    options: ["ITEW", "CEEW", "LSEEW", "EETW", "TLSEW", "MDW", "LIW"],
  },
  Battery: {
    classificationType: "battery_type",
    options: ["Portable", "Automotive", "Electric Vehicle", "Industrial"],
  },
  Tyre: {
    classificationType: "tyre_certificate_type",
    options: ["Reclaimed Rubber", "Crumb Rubber", "CRMB", "Recovered Carbon Black", "Pyrolysis Oil or Char", "Retreading"],
  },
  "Used Oil": {
    classificationType: "used_oil_type",
    options: [
      "Virgin Base Oil", "White Oil", "Hydraulic Oil", "Transformer Oil", "Cutting Oil",
      "Rubber Processing Oil", "Thermal Fluids", "Anti-Rust Oil", "General Purpose Lubrication Oil",
      "Engine Oil", "Brake Oil", "Grease", "Re-Refined / Recycled Base Oil", "Gear Oil",
      "Turbine Oil", "Compressor Oil",
    ],
  },
  ELV: {
    classificationType: "elv_vehicle_type",
    options: ["Two Wheeler", "Three Wheeler", "Four Wheeler", "Other Motor Vehicle"],
  },
};

export const getEprTaxonomy = (type) => EPR_TAXONOMY[type] || null;

export const validateEeeItemCode = (code, category) => {
  if (category !== "E-Waste") return true;
  const match = String(code || "").trim().toUpperCase().match(/^([A-Z]+)(\d+)$/);
  if (!match) return false;
  const limits = { ITEW: 27, CEEW: 19, LSEEW: 34, EETW: 8, TLSEW: 6, MDW: 10, LIW: 2 };
  return match[1] === category && Number(match[2]) >= 1 && Number(match[2]) <= (limits[category] || 0);
};
