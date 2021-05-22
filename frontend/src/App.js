import './App.css';
import MainPage from "./containers/MainPage";
import {QueryClient, QueryClientProvider} from "react-query";

function App() {

    const queryClient = new QueryClient();

    return (
        <QueryClientProvider client={queryClient}>
            <MainPage />
        </QueryClientProvider>
    );
}

export default App;
