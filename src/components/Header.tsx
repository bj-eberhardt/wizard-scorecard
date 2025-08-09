import Logo from '../assets/wizard-logo.png';

export default function Header() {
  return (
    <div className="mb-4 text-center">
      <h1 className="text-xl font-bold">Punkteblock</h1>
      <img src={Logo} alt="logo" className="mx-auto" />
    </div>
  );
}

