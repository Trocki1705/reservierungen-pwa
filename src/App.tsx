import { Routes, Route } from "react-router-dom";
import { TopBar } from "./components/TopBar";
import Today from "./pages/Today";
import NewReservation from "./pages/NewReservation";

export default function App() {
  return (
    <>
      <TopBar />
      <div className="container">
        <Routes>
          <Route path="/" element={<Today />} />
          <Route path="/neu" element={<NewReservation />} />
        </Routes>
      </div>
    </>
  );
}
