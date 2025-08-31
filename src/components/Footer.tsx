export default function Footer() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 w-full z-40">
      <div className="rounded-t-xl bg-gradient-to-r from-sky-500 via-fuchsia-500 to-emerald-500 dark:from-blue-700 dark:via-indigo-700 dark:to-cyan-700 text-white shadow-lg">
        <div className="px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-extrabold tracking-tight text-lg" style={{fontFamily: 'var(--font-poppins), var(--font-geist-sans)'}}>
            <img src="/logo.svg" alt="Easy Result Logo" className="h-6 w-6" />
            © {new Date().getFullYear()} Easy Result
          </div>
          <p className="font-semibold/ tracking-wide">
            Powered by
            {' '}
            <a className="font-extrabold underline decoration-white/60 underline-offset-4 hover:decoration-white" href="https://github.com/somthehit" target="_blank" rel="noopener noreferrer">
              @Som Thehit
            </a>
          </p>
          <nav className="flex items-center gap-5 text-sm font-semibold">
            <a className="hover:opacity-90 transition-opacity" href="/privacy">Privacy</a>
            <a className="hover:opacity-90 transition-opacity" href="/terms">Terms</a>
            <a className="hover:opacity-90 transition-opacity" href="/contact">Contact</a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
