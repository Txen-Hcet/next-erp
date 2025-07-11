import bgNavel from "../../assets/img/navelBackgroundPrint.jpg";

export default function SuratJalanPrint(props) {
  const data = props.data;

  return (
    <div
      style={{
        position: "relative",
        width: "210mm",
        height: "297mm",
        overflow: "hidden",
      }}
    >
      {/* background image */}
      <img
        src={bgNavel}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: 0.1,
          zIndex: 0,
        }}
      />

      {/* konten */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          padding: "40px",
          boxSizing: "border-box",
          height: "100%",
        }}
      >
        <h1 class="text-2xl font-bold mb-4">Surat Jalan</h1>
        <p>
          <strong>Tipe:</strong> {data.type}
        </p>
        <p>
          <strong>No. Sequence:</strong> {data.sequence_number}
        </p>
        <p>
          <strong>Packing List ID:</strong> {data.packing_list_id}
        </p>
        <p>
          <strong>Catatan:</strong> {data.catatan}
        </p>

        <table class="mt-6 w-full border border-gray-400 text-sm">
          <thead class="bg-gray-100">
            <tr>
              <th class="border px-2 py-1">Roll ID</th>
              <th class="border px-2 py-1">Meter</th>
              <th class="border px-2 py-1">Yard</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, i) => (
              <tr key={i}>
                <td class="border px-2 py-1 text-center">
                  {item.packing_list_roll_id}
                </td>
                <td class="border px-2 py-1 text-center">{item.meter}</td>
                <td class="border px-2 py-1 text-center">{item.yard}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
