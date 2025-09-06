const MaterialIcons = ({ name, className = "" }) => {
  // Map of Material Icons names to their Unicode or SVG representations
  const icons = {
    search: "🔍",
    notifications: "🔔",
    account_balance_wallet: "💰",
    campaign: "📢",
    description: "📄",
    receipt_long: "🧾",
    hourglass_empty: "⏳",
    event: "📅",
    filter_alt: "⏳",
    more_vert: "⋮"
  };

  return <span className={`material-icons ${className}`}>{icons[name] || name}</span>;
};

export default MaterialIcons;