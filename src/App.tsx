import { Routes, Route } from "react-router-dom";
import { TopBar } from "./components/TopBar";
import AuthGate from "./components/AuthGate";
import Today from "./pages/Today";
import NewReservation from "./pages/NewReservation";
import TablePlan from "./pages/TablePlan";

export default function App() {
  return (
    <AuthGate>
      <Today />
    </AuthGate>
  );
}
