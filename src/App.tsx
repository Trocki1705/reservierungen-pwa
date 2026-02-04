import { Routes, Route } from "react-router-dom";
import { TopBar } from "./components/TopBar";
import Today from "./pages/Today";
import NewReservation from "./pages/NewReservation";
import TablePlan from "./pages/TablePlan";

export default function App() {
  return (
    <>
      <TopBar />
      <div className="container">
        <Routes>
          <Route path="/" element={<Today />} />
          <Route path="/tische" element={<TablePlan />} />
          <Route path="/neu" element={<NewReservation />} />
        </Routes>
      </div>
    </>
  );
}
