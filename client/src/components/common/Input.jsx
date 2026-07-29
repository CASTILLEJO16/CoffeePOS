import './Input.css';

export default function Input({ label, error, icon: Icon, helperText, ...props }) {
  return (
    <div className="input-group">
      {label && <label className="input-label">{label}</label>}
      <div className="input-wrapper">
        {Icon && <Icon className="input-icon" size={18} />}
        <input 
          className={`input ${error ? 'input-error' : ''} ${Icon ? 'input-with-icon' : ''}`} 
          {...props} 
        />
      </div>
      {error && <span className="input-error-text">{error}</span>}
      {helperText && !error && <span className="input-helper-text">{helperText}</span>}
    </div>
  );
}
