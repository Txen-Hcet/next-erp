import { createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { login } from "../utils/auth";
import Swal from "sweetalert2";
import logoNavel from "../assets/img/navelLogo.png";

export default function LoginPage() {
  const [username, setUsername] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [error, setError] = createSignal("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const user = await login(username(), password());

      Swal.fire({
        title: "Berhasil Login!",
        icon: "success",
        showConfirmButton: false,
        timer: 1000,
        timerProgressBar: true,
      }).then(() => navigate("/dashboard", { replace: true }));
    } catch (error) {
      Swal.fire({
        title: "Gagal!",
        icon: "error",
        text: "Username atau password salah",
        showConfirmButton: false,
        timer: 1000,
        timerProgressBar: true,
      });

      setError(error.message || "Username atau password salah.");
    }
  };

  return (
    <div class="flex justify-center items-center h-screen bg-gray-100 font-mono">
      <div class="bg-white p-8 rounded shadow-md w-full max-w-md">
        <img class="h-52 mx-auto" src={logoNavel} alt="" />
        <h1 class="text-2xl font-bold mb-6 text-center uppercase">Login</h1>
        {error() && <p class="text-red-500 mb-4">{error()}</p>}
        <form onsubmit={handleLogin}>
          <input
            class="w-full mb-4 px-4 py-2 border rounded"
            type="text"
            placeholder="Username"
            value={username()}
            onInput={(e) => setUsername(e.target.value)}
          />
          <input
            class="w-full mb-4 px-4 py-2 border rounded"
            type="password"
            placeholder="Password"
            value={password()}
            onInput={(e) => setPassword(e.target.value)}
          />
          <button class="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
            Login
          </button>
        </form>
      </div>
    </div>
  );
}
