export function About() {
  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-12 md:px-12 lg:px-24 transition-colors">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-6">About</h1>
        <p className="text-lg mb-4">
          <span className="font-semibold text-primary">Nuspace.kz</span> is a private digital platform designed exclusively for
          Nazarbayev University students. Access is restricted to verified university emails
          (<span className="text-blue-600 dark:text-blue-400 font-medium">@nu.edu.kz</span>), ensuring a secure environment and preventing external access.
        </p>
        <p className="text-lg mb-4">
          The platform brings together essential services for learning and communication,
          replacing scattered and inefficient Telegram chats. Nuspace provides a reliable,
          centralized, and convenient experience for student interaction — all in one place.
        </p>
      </div>
    </div>
  );
};
