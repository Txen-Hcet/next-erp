import bgNavel from "../../assets/img/navelBackgroundPrint.jpg";

export default function PackingOrderPrint(props) {
  const data = props.data;

  return (
    <>
      <style>{`
        @page {
          size: A4 portrait;
          margin: 0;
        }
        html, body {
          margin: 0;
          padding: 0;
          height: 100%;
          width: 100%;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      `}</style>

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
            padding: "120px 40px 40px 40px",
            boxSizing: "border-box",
            height: "100%",
          }}
        >
          <h1 class="text-2xl font-bold mb-4">Packing Order</h1>
          <p>
            <strong>Tipe:</strong> {data.type}
          </p>
          <p>
            <strong>No. Sequence:</strong> {data.sequence_number}
          </p>
          <p>
            <strong>Sales Order:</strong> {data.sales_order_id}
          </p>
          <p>
            <strong>Col:</strong> {data.col}
          </p>
          <p>
            <strong>Catatan:</strong> {data.catatan}
          </p>

          <table class="mt-6 w-full border border-gray-400 text-sm">
            <thead class="bg-gray-100">
              <tr>
                <th class="border px-2 py-1">Item</th>
                <th class="border px-2 py-1">Roll</th>
                <th class="border px-2 py-1">Meter</th>
                <th class="border px-2 py-1">Yard</th>
              </tr>
            </thead>
            <tbody>
              {data.itemGroups.map((group, i) =>
                group.rolls.map((roll, j) => (
                  <tr>
                    <td class="border px-2 py-1">
                      {group.sales_order_item_id}
                    </td>
                    <td class="border px-2 py-1">{j + 1}</td>
                    <td class="border px-2 py-1">{roll.meter_total}</td>
                    <td class="border px-2 py-1">{roll.yard_total}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
