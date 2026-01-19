import Sidebar from "@/components/Sidebar";

const Layout = ({ children }) => {
  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      <Sidebar />
      <main className="flex-1 overflow-y-auto h-screen p-4 lg:p-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
};

export default Layout;
