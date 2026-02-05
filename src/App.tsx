import { Routes, Route } from "react-router-dom";
import AuthGate from "./components/AuthGate";

import Today from "./pages/Today";
import NewReservation from "./pages/NewReservation";
import TablePlan from "./pages/TablePlan";

export default function App() {
  return (
    <AuthGate>
      <Routes>
        <Route path="/" element={<Today />} />
        <Route path="/new" element={<NewReservation />} />
        <Route path="/tables" element={<TablePlan />} />
        {/* ggf. weitere Routes */}
      </Routes>
    </AuthGate>
  );
}
