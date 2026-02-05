import { Routes, Route } from "react-router-dom";
import AuthGate from "./components/AuthGate";
import { TopBar } from "./components/TopBar";

import Today from "./pages/Today";
import NewReservation from "./pages/NewReservation";
import TablePlan from "./pages/TablePlan";

export default function App() {
  return (
  
  <AuthGate>
  <div style={{ padding: 10, background: "yellow", fontWeight: 800 }}>
    APP INHALT SICHTBAR ✅
  </div>

  <TopBar />
  <Routes>
        <Route path="/" element={<Today />} />
        <Route path="/new" element={<NewReservation />} />
        <Route path="/tables" element={<TablePlan />} />
      </Routes>
</AuthGate>
  
  
  
   
  );
}
