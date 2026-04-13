export const Header = () => (
  <div className="bg-slate-800 shadow-lg shadow-slate-900/50">
    <div className="px-4 py-3 sm:px-10 sm:py-4 lg:px-16">
      <h1 className="text-slate-100">
        <div className="flex items-end gap-2">
          <a href="/">
            <img src="/lances-logo.svg" alt="Lance's" className="inline-block h-12 sm:h-[3.2rem]" />
          </a>
          <span className="hidden sm:inline text-3xl">Factor Portfolio Analyzer</span>
        </div>
        <span className="block sm:hidden text-lg mt-1">Factor Portfolio Analyzer</span>
      </h1>
    </div>
  </div>
);
