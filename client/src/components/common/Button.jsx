import './Button.css';

export default function Button({ children, variant = 'primary', size = 'medium', icon: Icon, ...props }) {
  const classes = `btn btn-${variant} btn-${size}`;

  return (
    <button className={classes} {...props}>
      {Icon && <Icon className="btn-icon" size={size === 'small' ? 16 : size === 'large' ? 20 : 18} />}
      {children}
    </button>
  );
}
