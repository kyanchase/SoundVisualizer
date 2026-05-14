export default function Loader({ active, text }) {
  return (
    <div id="loader" className={active ? 'active' : ''}>
      <div className="spinner"></div>
      <div id="loader-text">{text}</div>
    </div>
  );
}
