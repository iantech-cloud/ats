import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navbar } from "@/components/navbar";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Bots from "@/pages/bots";
import Chat from "@/pages/chat";
import Pay from "@/pages/pay";
import Account from "@/pages/account";
import Wallet from "@/pages/wallet";
import Admin from "@/pages/admin";

const queryClient = new QueryClient();

function Router() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 w-full bg-background">
        <Switch>
          <Route path="/" component={Landing} />
          <Route path="/account" component={Account} />
          <Route path="/wallet" component={Wallet} />
          <Route path="/admin" component={Admin} />
          <Route path="/bots" component={Bots} />
          <Route path="/chat/:botId" component={Chat} />
          <Route path="/pay" component={Pay} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
