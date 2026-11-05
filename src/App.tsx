/**
 * NOTE: a temporary root component that proves the tooling works.
 * Why it exists: step 1 of the PRD asks for a building project with working Tailwind classes before
 * any feature exists. The real routes and layout replace this in the first feature branch.
 */
export default function App() {
  return <h1 className="p-8 text-3xl font-bold text-pink-500">10X Shop</h1>;
}
