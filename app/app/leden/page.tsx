type Lid = {
  id: string;
  naam: string;
  email: string;
  les: string;
};

async function fetchLeden(): Promise<Lid[]> {
  const csvUrl = "https://docs.google.com/spreadsheets/d/1xkDxiNuefHzYB__KPai0M5bXWIURporgFvKmnKTxAr4/export?format=csv&gid=0"; // <-- vervang dit

  const res = await fetch(csvUrl);

  if (!res.ok) {
    throw new Error("Kon de ledenlijst niet ophalen");
  }

  const text = await res.text();

  const [headerLine, ...lines] = text.trim().split("\n");

  // We gaan ervan uit dat de kolomvolgorde is: id, naam, email, les
  return lines.map((line) => {
    const cells = line.split(",");

    return {
      id: cells[0] ?? "",
      naam: cells[1] ?? "",
      email: cells[2] ?? "",
      les: cells[3] ?? "",
    };
  });
}

export default async function LedenPage() {
  const leden = await fetchLeden();

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <h1 className="text-2xl font-bold text-pink-500 mb-4">Leden</h1>
      <p className="text-gray-300 mb-4">
        Deze lijst komt nu direct uit je Google Sheet (testdata).
      </p>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left py-2 
pr-4">ID</th>
              <th className="text-left py-2 pr-4">Naam</th>
              <th className="text-left py-2 pr-4">Email</th>
              <th className="text-left py-2
 pr-4">Les</th>
            </tr>
          </thead>
          <tbody>
            {leden.map((lid) => (
              <tr key={lid.id} className="border-b border-gray-800">
                <td className="py-2 pr-4">{lid.id}</td>
                <td className="py-2 pr-4">{lid.naam}</td>
                <td className="py-2 pr-4">{lid.email}</td>
                <td className="py-2 pr-4">{lid.les}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}