interface HeaderProps {
    left?: JSX.Element;   
    center?: JSX.Element; 
    right?: JSX.Element;  
}

export function Header({ left, center, right }: HeaderProps) {
    return (
      <header className="w-full sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-lg">
        <div className="flex justify-between items-center px-4 py-2">
          <div>{left}</div>
          <div>{center}</div>
          <div>{right}</div>
        </div>
      </header>
    );
  }