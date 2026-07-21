export const Logo = ({ className }: { className?: string }) => {
  return (
    <svg
      version="1.2"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      width="100"
      height="100"
      className={className}
    >
      <defs>
        <style>{`.a{stroke:#f00;stroke-width:10}.b{fill:none;stroke:#f00;stroke-width:10}`}</style>
        <filter id="f0">
          <feFlood floodColor="#22c55e" floodOpacity="1" />
          <feBlend mode="normal" in2="SourceGraphic" />
          <feComposite in2="SourceAlpha" operator="in" />
        </filter>
      </defs>
      <g filter="url(#f0)">
        <path className="a" d="m50 1v34z" />
        <path className="a" d="m50 65v35z" />
        <path className="a" d="m35 50h-35z" />
        <path className="a" d="m100 50h-35z" />
        <path
          fillRule="evenodd"
          className="b"
          d="m50 83c-18.2 0-33-14.8-33-33 0-18.2 14.8-33 33-33 18.2 0 33 14.8 33 33 0 18.2-14.8 33-33 33z"
        />
      </g>
    </svg>
  )
}
