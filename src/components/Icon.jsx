/**
 * Material Symbols Outlined icon helper.
 * Usage: <Icon name="mail" className="text-[18px]" />
 */
export default function Icon({ name, className = '', style }) {
  return (
    <span className={`material-symbols-outlined ${className}`} style={style}>
      {name}
    </span>
  );
}
