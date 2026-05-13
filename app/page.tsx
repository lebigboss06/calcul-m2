"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";

type Room = {
  id: string;
  name: string;
  length: number;
  width: number;
  surface: number;
  photoBase64?: string | null;
};

type Client = {
  id: string;
  name: string;
};

const LEGACY_ROOMS_STORAGE_KEY = "rooms-m2-calculator";
const LEGACY_CLIENTS_STORAGE_KEY = "clients-m2-calculator";
const LEGACY_ROOMS_BY_CLIENT_STORAGE_KEY = "rooms-by-client-m2-calculator";
const LEGACY_SELECTED_CLIENT_STORAGE_KEY = "selected-client-m2-calculator";
const ACCOUNTS_STORAGE_KEY = "appAccounts";
const SESSION_STORAGE_KEY = "appSession";
const MAX_IMAGE_WIDTH = 900;
const JPEG_QUALITY = 0.7;
const MAX_PHOTO_BYTES = 900 * 1024;

type Account = {
  email: string;
  password: string;
};

const getUserStorageKey = (email: string, key: string) =>
  `${email.trim().toLowerCase()}::${key}`;

const getDataUrlByteSize = (dataUrl: string) => {
  const base64Part = dataUrl.split(",")[1] ?? "";
  return Math.ceil((base64Part.length * 3) / 4);
};

function AnimatedBackdrop() {
  return (
    <>
      <div className="pointer-events-none fixed inset-0 -z-20 bg-[#070b1f]" />
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="aurora aurora-one" />
        <div className="aurora aurora-two" />
        <div className="aurora aurora-three" />
        <div className="grid-overlay" />
      </div>
    </>
  );
}

function AnimatedStyles() {
  return (
    <style jsx global>{`
      .aurora {
        position: absolute;
        border-radius: 9999px;
        filter: blur(80px);
        opacity: 0.55;
        mix-blend-mode: screen;
        animation: drift 18s ease-in-out infinite;
      }
      .aurora-one {
        width: 40vw;
        height: 40vw;
        min-width: 280px;
        min-height: 280px;
        background: radial-gradient(circle, #3b82f6 0%, transparent 70%);
        top: -12%;
        left: -8%;
      }
      .aurora-two {
        width: 42vw;
        height: 42vw;
        min-width: 280px;
        min-height: 280px;
        background: radial-gradient(circle, #8b5cf6 0%, transparent 70%);
        top: 25%;
        right: -12%;
        animation-delay: -6s;
      }
      .aurora-three {
        width: 34vw;
        height: 34vw;
        min-width: 250px;
        min-height: 250px;
        background: radial-gradient(circle, #22d3ee 0%, transparent 68%);
        bottom: -14%;
        left: 20%;
        animation-delay: -12s;
      }
      .grid-overlay {
        position: absolute;
        inset: 0;
        background-image: linear-gradient(
            rgba(148, 163, 184, 0.09) 1px,
            transparent 1px
          ),
          linear-gradient(90deg, rgba(148, 163, 184, 0.08) 1px, transparent 1px);
        background-size: 56px 56px;
        mask-image: radial-gradient(circle at center, black 35%, transparent 100%);
      }
      .glass-card {
        background: linear-gradient(
          135deg,
          rgba(255, 255, 255, 0.22),
          rgba(255, 255, 255, 0.08)
        );
        border: 1px solid rgba(255, 255, 255, 0.28);
        box-shadow: 0 20px 60px -25px rgba(56, 189, 248, 0.45),
          0 12px 30px -20px rgba(139, 92, 246, 0.45);
        backdrop-filter: blur(16px);
      }
      .hover-lift {
        transition: transform 350ms ease, box-shadow 350ms ease,
          border-color 350ms ease;
      }
      .hover-lift:hover {
        transform: translateY(-4px);
        border-color: rgba(255, 255, 255, 0.4);
        box-shadow: 0 26px 70px -28px rgba(56, 189, 248, 0.55),
          0 18px 40px -24px rgba(139, 92, 246, 0.55);
      }
      .premium-btn {
        position: relative;
        overflow: hidden;
        background: linear-gradient(120deg, #2563eb, #7c3aed, #2563eb);
        background-size: 220% 220%;
        color: white;
        transition: transform 220ms ease, box-shadow 220ms ease;
        animation: gradientShift 5s ease infinite;
      }
      .premium-btn::before {
        content: "";
        position: absolute;
        top: 0;
        left: -130%;
        width: 55%;
        height: 100%;
        background: linear-gradient(
          90deg,
          transparent,
          rgba(255, 255, 255, 0.5),
          transparent
        );
        transform: skewX(-25deg);
      }
      .premium-btn:hover::before {
        animation: shine 900ms ease;
      }
      .premium-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 18px 35px -18px rgba(59, 130, 246, 0.8);
      }
      .fade-in {
        animation: fadeInUp 700ms ease both;
      }
      .fade-in-delay {
        animation: fadeInUp 850ms ease both;
      }
      .soft-input {
        background: rgba(255, 255, 255, 0.7);
        border: 1px solid rgba(255, 255, 255, 0.35);
      }
      .soft-input:focus {
        border-color: rgba(125, 211, 252, 0.9);
        box-shadow: 0 0 0 4px rgba(56, 189, 248, 0.22);
      }
      @keyframes drift {
        0%,
        100% {
          transform: translate3d(0, 0, 0) scale(1);
        }
        35% {
          transform: translate3d(30px, -28px, 0) scale(1.08);
        }
        70% {
          transform: translate3d(-26px, 24px, 0) scale(0.94);
        }
      }
      @keyframes gradientShift {
        0% {
          background-position: 0% 50%;
        }
        50% {
          background-position: 100% 50%;
        }
        100% {
          background-position: 0% 50%;
        }
      }
      @keyframes shine {
        to {
          left: 160%;
        }
      }
      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(14px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `}</style>
  );
}

export default function Home() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [createEmailInput, setCreateEmailInput] = useState("");
  const [createPasswordInput, setCreatePasswordInput] = useState("");
  const [loginEmailInput, setLoginEmailInput] = useState("");
  const [loginPasswordInput, setLoginPasswordInput] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [connectedEmail, setConnectedEmail] = useState("");
  const [authError, setAuthError] = useState("");
  const [isUserDataReady, setIsUserDataReady] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [roomName, setRoomName] = useState("");
  const [lengthValue, setLengthValue] = useState("");
  const [widthValue, setWidthValue] = useState("");
  const [roomPhotoBase64, setRoomPhotoBase64] = useState<string | null>(null);
  const [roomsByClient, setRoomsByClient] = useState<Record<string, Room[]>>({});
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const rawAccounts = window.localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    let parsedAccounts: Account[] = [];

    try {
      const rawParsed = rawAccounts ? (JSON.parse(rawAccounts) as Account[]) : [];
      parsedAccounts = Array.isArray(rawParsed)
        ? rawParsed
            .filter(
              (account) =>
                typeof account?.email === "string" &&
                typeof account?.password === "string",
            )
            .map((account) => ({
              email: account.email.trim().toLowerCase(),
              password: account.password,
            }))
        : [];
    } catch {
      parsedAccounts = [];
    }

    setAccounts(parsedAccounts);

    const localSession = window.localStorage.getItem(SESSION_STORAGE_KEY);
    const browserSession = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    const rawSession = localSession ?? browserSession;

    if (!rawSession) return;

    try {
      const parsedSession = JSON.parse(rawSession) as { email?: string };
      const sessionEmail = parsedSession?.email?.trim().toLowerCase();
      if (
        sessionEmail &&
        parsedAccounts.some((account) => account.email === sessionEmail)
      ) {
        setConnectedEmail(sessionEmail);
        setIsAuthenticated(true);
      }
    } catch {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !connectedEmail) {
      setClients([]);
      setRoomsByClient({});
      setSelectedClientId("");
      setIsUserDataReady(false);
      return;
    }

    setIsUserDataReady(false);
    const rawClients = window.localStorage.getItem(
      getUserStorageKey(connectedEmail, "clients"),
    );
    const rawRoomsByClient = window.localStorage.getItem(
      getUserStorageKey(connectedEmail, "roomsByClient"),
    );
    const rawSelectedClient = window.localStorage.getItem(
      getUserStorageKey(connectedEmail, "selectedClientId"),
    );
    const rawLegacyRooms = window.localStorage.getItem(LEGACY_ROOMS_STORAGE_KEY);

    try {
      const parsedClients = rawClients ? (JSON.parse(rawClients) as Client[]) : [];
      const parsedRoomsByClient = rawRoomsByClient
        ? (JSON.parse(rawRoomsByClient) as Record<string, Room[]>)
        : {};
      const safeClients = Array.isArray(parsedClients) ? parsedClients : [];
      const safeRoomsByClient: Record<string, Room[]> = {};

      if (parsedRoomsByClient && typeof parsedRoomsByClient === "object") {
        for (const [clientId, clientRooms] of Object.entries(parsedRoomsByClient)) {
          if (!Array.isArray(clientRooms)) continue;
          safeRoomsByClient[clientId] = clientRooms.map((room) => ({
            id: String(room.id ?? crypto.randomUUID()),
            name: String(room.name ?? ""),
            length: Number(room.length ?? 0),
            width: Number(room.width ?? 0),
            surface: Number(room.surface ?? 0),
            photoBase64:
              typeof room.photoBase64 === "string" ? room.photoBase64 : null,
          }));
        }
      }

      setClients(safeClients);
      setRoomsByClient(safeRoomsByClient);

      const hasSelectedClient =
        typeof rawSelectedClient === "string" &&
        safeClients.some((client) => client.id === rawSelectedClient);

      if (hasSelectedClient) {
        setSelectedClientId(rawSelectedClient);
      } else {
        setSelectedClientId(safeClients[0]?.id ?? "");
      }

      const noClientData = !rawClients && safeClients.length === 0;
      if (noClientData && rawLegacyRooms) {
        const parsedLegacyRooms = JSON.parse(rawLegacyRooms) as Room[];
        if (Array.isArray(parsedLegacyRooms) && parsedLegacyRooms.length > 0) {
          const migratedClient: Client = {
            id: crypto.randomUUID(),
            name: "Client existant",
          };
          setClients([migratedClient]);
          setRoomsByClient({ [migratedClient.id]: parsedLegacyRooms });
          setSelectedClientId(migratedClient.id);
        }
      }
    } catch {
      window.localStorage.removeItem(getUserStorageKey(connectedEmail, "clients"));
      window.localStorage.removeItem(getUserStorageKey(connectedEmail, "roomsByClient"));
      window.localStorage.removeItem(
        getUserStorageKey(connectedEmail, "selectedClientId"),
      );
    } finally {
      setIsUserDataReady(true);
    }
  }, [isAuthenticated, connectedEmail]);

  useEffect(() => {
    if (!isAuthenticated || !connectedEmail || !isUserDataReady) return;
    window.localStorage.setItem(
      getUserStorageKey(connectedEmail, "clients"),
      JSON.stringify(clients),
    );
  }, [clients, isAuthenticated, connectedEmail, isUserDataReady]);

  useEffect(() => {
    if (!isAuthenticated || !connectedEmail || !isUserDataReady) return;
    window.localStorage.setItem(
      getUserStorageKey(connectedEmail, "roomsByClient"),
      JSON.stringify(roomsByClient),
    );
  }, [roomsByClient, isAuthenticated, connectedEmail, isUserDataReady]);

  useEffect(() => {
    if (!isAuthenticated || !connectedEmail || !isUserDataReady) return;
    window.localStorage.setItem(
      getUserStorageKey(connectedEmail, "selectedClientId"),
      selectedClientId,
    );
  }, [selectedClientId, isAuthenticated, connectedEmail, isUserDataReady]);

  useEffect(() => {
    if (!clients.length) {
      if (selectedClientId) {
        setSelectedClientId("");
      }
      return;
    }

    const selectedStillExists = clients.some((client) => client.id === selectedClientId);
    if (!selectedStillExists) {
      setSelectedClientId(clients[0].id);
    }
  }, [clients, selectedClientId]);

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedClientId) ?? null,
    [clients, selectedClientId],
  );

  const rooms = useMemo(
    () => (selectedClientId ? roomsByClient[selectedClientId] ?? [] : []),
    [roomsByClient, selectedClientId],
  );

  const currentLength = Number.parseFloat(lengthValue) || 0;
  const currentWidth = Number.parseFloat(widthValue) || 0;
  const currentSurface = currentLength * currentWidth;

  const getRoomSurface = (room: Room) => {
    const parsedSurface = Number(room.surface);
    if (Number.isFinite(parsedSurface) && parsedSurface >= 0) {
      return parsedSurface;
    }

    const parsedLength = Number(room.length);
    const parsedWidth = Number(room.width);
    return parsedLength * parsedWidth;
  };

  const compressImageToBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const image = new Image();
        image.onload = () => {
          const ratio = image.width > MAX_IMAGE_WIDTH ? MAX_IMAGE_WIDTH / image.width : 1;
          const targetWidth = Math.max(1, Math.round(image.width * ratio));
          const targetHeight = Math.max(1, Math.round(image.height * ratio));

          const canvas = document.createElement("canvas");
          canvas.width = targetWidth;
          canvas.height = targetHeight;

          const context = canvas.getContext("2d");
          if (!context) {
            reject(new Error("Impossible de préparer la compression de la photo."));
            return;
          }

          context.drawImage(image, 0, 0, targetWidth, targetHeight);
          const compressedBase64 = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
          resolve(compressedBase64);
        };
        image.onerror = () => reject(new Error("Photo invalide."));
        image.src = String(reader.result);
      };
      reader.onerror = () => reject(new Error("Impossible de lire la photo."));
      reader.readAsDataURL(file);
    });

  const handlePhotoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) {
      setRoomPhotoBase64(null);
      return;
    }

    try {
      if (!selectedFile.type.startsWith("image/")) {
        throw new Error("Veuillez sélectionner une image.");
      }

      const compressedBase64 = await compressImageToBase64(selectedFile);
      if (getDataUrlByteSize(compressedBase64) > MAX_PHOTO_BYTES) {
        throw new Error(
          "Photo trop lourde après compression. Choisissez une image plus légère.",
        );
      }

      setRoomPhotoBase64(compressedBase64);
      setErrorMessage("");
    } catch (error) {
      const fallbackMessage =
        error instanceof Error && error.message
          ? error.message
          : "La photo n'a pas pu être chargée. La pièce sera ajoutée sans photo.";
      setErrorMessage(fallbackMessage);
      setRoomPhotoBase64(null);
    } finally {
      event.target.value = "";
    }
  };

  const openPhotoPicker = () => {
    const input = document.querySelector(
      "input[type='file'][accept='image/*'][capture='environment']",
    ) as HTMLInputElement | null;
    input?.click();
  };

  const totalSurface = useMemo(
    () => rooms.reduce((sum, room) => sum + getRoomSurface(room), 0),
    [rooms],
  );

  const handleAddRoom = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedClientId) {
      setErrorMessage("Veuillez choisir un client.");
      return;
    }

    const parsedLength = Number.parseFloat(lengthValue);
    const parsedWidth = Number.parseFloat(widthValue);
    const cleanedName = roomName.trim();

    if (!cleanedName) {
      setErrorMessage("Veuillez saisir un nom de pièce.");
      return;
    }

    if (!Number.isFinite(parsedLength) || parsedLength <= 0) {
      setErrorMessage("La longueur doit être un nombre supérieur à 0.");
      return;
    }

    if (!Number.isFinite(parsedWidth) || parsedWidth <= 0) {
      setErrorMessage("La largeur doit être un nombre supérieur à 0.");
      return;
    }

    const newRoom: Room = {
      id: crypto.randomUUID(),
      name: cleanedName,
      length: parsedLength,
      width: parsedWidth,
      surface: parsedLength * parsedWidth,
      photoBase64: roomPhotoBase64,
    };

    setRoomsByClient((prevRoomsByClient) => ({
      ...prevRoomsByClient,
      [selectedClientId]: [newRoom, ...(prevRoomsByClient[selectedClientId] ?? [])],
    }));
    setRoomName("");
    setLengthValue("");
    setWidthValue("");
    setRoomPhotoBase64(null);
    setErrorMessage("");
  };

  const handleCreateAccount = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const cleanedEmail = createEmailInput.trim().toLowerCase();
    const cleanedPassword = createPasswordInput;

    if (!cleanedEmail || !cleanedEmail.includes("@")) {
      setAuthError("Veuillez saisir un email valide.");
      return;
    }
    if (!cleanedPassword) {
      setAuthError("Veuillez saisir un mot de passe.");
      return;
    }
    if (accounts.some((account) => account.email === cleanedEmail)) {
      setAuthError("Un compte existe déjà avec cet email.");
      return;
    }

    const nextAccounts = [...accounts, { email: cleanedEmail, password: cleanedPassword }];
    setAccounts(nextAccounts);
    window.localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(nextAccounts));
    setCreateEmailInput("");
    setCreatePasswordInput("");
    setLoginEmailInput(cleanedEmail);
    setLoginPasswordInput("");
    setAuthError("Compte créé. Connectez-vous.");
  };

  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const cleanedEmail = loginEmailInput.trim().toLowerCase();
    const matchedAccount = accounts.find(
      (account) =>
        account.email === cleanedEmail && account.password === loginPasswordInput,
    );

    if (!matchedAccount) {
      setAuthError("Email ou mot de passe incorrect.");
      return;
    }

    setConnectedEmail(matchedAccount.email);
    setIsAuthenticated(true);
    setAuthError("");
    setLoginPasswordInput("");

    const sessionPayload = JSON.stringify({ email: matchedAccount.email });
    if (rememberMe) {
      window.localStorage.setItem(SESSION_STORAGE_KEY, sessionPayload);
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } else {
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, sessionPayload);
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setConnectedEmail("");
    setAuthError("");
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
  };

  const handleAddClient = () => {
    const cleanedClientName = clientName.trim();

    if (!cleanedClientName) {
      setErrorMessage("Veuillez saisir un nom de client.");
      return;
    }

    const newClient: Client = {
      id: crypto.randomUUID(),
      name: cleanedClientName,
    };

    setClients((prevClients) => [newClient, ...prevClients]);
    setRoomsByClient((prevRoomsByClient) => ({
      ...prevRoomsByClient,
      [newClient.id]: [],
    }));
    setSelectedClientId(newClient.id);
    setClientName("");
    setErrorMessage("");
  };

  const handleDeleteRoom = (id: string) => {
    if (!selectedClientId) return;

    setRoomsByClient((prevRoomsByClient) => ({
      ...prevRoomsByClient,
      [selectedClientId]: (prevRoomsByClient[selectedClientId] ?? []).filter(
        (room) => room.id !== id,
      ),
    }));
  };

  const handleClearAll = () => {
    if (!selectedClientId) return;

    setRoomsByClient((prevRoomsByClient) => ({
      ...prevRoomsByClient,
      [selectedClientId]: [],
    }));
  };

  const handleDeleteSelectedClient = () => {
    if (!selectedClientId) return;

    const remainingClients = clients.filter((client) => client.id !== selectedClientId);
    const nextSelectedClientId = remainingClients[0]?.id ?? "";

    setClients(remainingClients);
    setRoomsByClient((prevRoomsByClient) => {
      const nextRoomsByClient = { ...prevRoomsByClient };
      delete nextRoomsByClient[selectedClientId];
      return nextRoomsByClient;
    });
    setSelectedClientId(nextSelectedClientId);
    setErrorMessage("");
  };

  if (accounts.length === 0) {
    return (
      <div className="relative min-h-screen overflow-hidden px-4 py-8 sm:px-6 sm:py-10">
        <AnimatedBackdrop />
        <AnimatedStyles />
        <main className="mx-auto w-full max-w-md">
          <section className="glass-card hover-lift fade-in rounded-3xl p-6 sm:p-8">
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Créer un compte
            </h1>
            <p className="mt-2 text-sm text-blue-100/90">
              Configurez un compte local (email + mot de passe) pour accéder au calculateur.
            </p>

            <form onSubmit={handleCreateAccount} className="mt-6 space-y-4">
              <div>
                <label
                  htmlFor="createEmail"
                  className="mb-1.5 block text-sm font-medium text-blue-50"
                >
                  Email
                </label>
                <input
                  id="createEmail"
                  type="email"
                  value={createEmailInput}
                  onChange={(event) => setCreateEmailInput(event.target.value)}
                  className="soft-input w-full rounded-xl px-4 py-3 text-slate-900 outline-none transition"
                />
              </div>

              <div>
                <label
                  htmlFor="createPassword"
                  className="mb-1.5 block text-sm font-medium text-blue-50"
                >
                  Mot de passe
                </label>
                <input
                  id="createPassword"
                  type="password"
                  value={createPasswordInput}
                  onChange={(event) => setCreatePasswordInput(event.target.value)}
                  className="soft-input w-full rounded-xl px-4 py-3 text-slate-900 outline-none transition"
                />
              </div>

              {authError ? (
                <p className="rounded-lg border border-red-200/40 bg-red-500/20 px-3 py-2 text-sm font-medium text-red-100">
                  {authError}
                </p>
              ) : null}

              <button
                type="submit"
                className="premium-btn w-full rounded-xl px-4 py-3 font-semibold active:scale-[0.99]"
              >
                Créer mon compte
              </button>
            </form>
          </section>
        </main>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="relative min-h-screen overflow-hidden px-4 py-8 sm:px-6 sm:py-10">
        <AnimatedBackdrop />
        <AnimatedStyles />
        <main className="mx-auto w-full max-w-md">
          <section className="glass-card hover-lift fade-in rounded-3xl p-6 sm:p-8">
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Connexion
            </h1>
            <p className="mt-2 text-sm text-blue-100/90">
              Connectez-vous avec votre email et votre mot de passe.
            </p>

            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              <div>
                <label
                  htmlFor="loginEmail"
                  className="mb-1.5 block text-sm font-medium text-blue-50"
                >
                  Email
                </label>
                <input
                  id="loginEmail"
                  type="email"
                  value={loginEmailInput}
                  onChange={(event) => setLoginEmailInput(event.target.value)}
                  className="soft-input w-full rounded-xl px-4 py-3 text-slate-900 outline-none transition"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-sm font-medium text-blue-50"
                >
                  Mot de passe
                </label>
                <input
                  id="password"
                  type="password"
                  value={loginPasswordInput}
                  onChange={(event) => setLoginPasswordInput(event.target.value)}
                  className="soft-input w-full rounded-xl px-4 py-3 text-slate-900 outline-none transition"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-blue-100">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                />
                Se souvenir de moi
              </label>

              {authError ? (
                <p className="rounded-lg border border-red-200/40 bg-red-500/20 px-3 py-2 text-sm font-medium text-red-100">
                  {authError}
                </p>
              ) : null}

              <button
                type="submit"
                className="premium-btn w-full rounded-xl px-4 py-3 font-semibold active:scale-[0.99]"
              >
                Se connecter
              </button>
            </form>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-8 sm:px-6 sm:py-10">
      <AnimatedBackdrop />
      <AnimatedStyles />
      <main className="mx-auto w-full max-w-6xl">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <p className="glass-card rounded-lg px-4 py-2 text-sm font-medium text-blue-50">
            Connecté : {connectedEmail}
          </p>
          <button
            type="button"
            onClick={handleLogout}
            className="glass-card hover-lift rounded-lg px-4 py-2 text-sm font-medium text-blue-50"
          >
            Déconnexion
          </button>
        </div>
        <p className="mb-6 text-right text-sm text-blue-100/90">
          Données sauvegardées automatiquement
        </p>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
          <section className="glass-card hover-lift fade-in rounded-3xl p-6 sm:p-8">
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Calculateur de m²
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-blue-100/90 sm:text-base">
              Ajoutez chaque pièce pour obtenir la surface totale de votre projet.
            </p>

            <div className="mt-6 rounded-2xl border border-white/30 bg-white/10 p-4 backdrop-blur-sm sm:p-5">
              <p className="text-sm font-semibold text-blue-50">Nom du client</p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  value={clientName}
                  onChange={(event) => setClientName(event.target.value)}
                  placeholder="Ex: M. Dupont"
                  className="soft-input w-full rounded-xl px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={handleAddClient}
                  className="premium-btn rounded-xl px-4 py-3 text-sm font-semibold"
                >
                  Ajouter le client
                </button>
              </div>

              <label
                htmlFor="clientSelect"
                className="mt-4 block text-sm font-semibold text-blue-50"
              >
                Choisir un client
              </label>
              <select
                id="clientSelect"
                value={selectedClientId}
                onChange={(event) => setSelectedClientId(event.target.value)}
                className="soft-input mt-2 w-full rounded-xl px-4 py-3 text-slate-900 outline-none transition"
              >
                <option value="">-- Sélectionner --</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>

              <div className="mt-3 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-blue-100/90">
                  Client sélectionné :{" "}
                  <span className="font-semibold text-white">
                    {selectedClient?.name ?? "Aucun"}
                  </span>
                </p>
                <button
                  type="button"
                  onClick={handleDeleteSelectedClient}
                  disabled={!selectedClientId}
                  className="rounded-lg border border-red-200/50 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-100 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Supprimer client
                </button>
              </div>
            </div>

            <form onSubmit={handleAddRoom} className="mt-7 space-y-5">
              <div>
                <label
                  htmlFor="roomName"
                  className="mb-1.5 block text-sm font-medium text-blue-50"
                >
                  Nom de la pièce
                </label>
                <input
                  id="roomName"
                  type="text"
                  disabled={!selectedClientId}
                  value={roomName}
                  onChange={(event) => setRoomName(event.target.value)}
                  placeholder="Ex: Salon"
                  className="soft-input w-full rounded-xl px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="length"
                    className="mb-1.5 block text-sm font-medium text-blue-50"
                  >
                    Longueur (m)
                  </label>
                  <input
                    id="length"
                    type="number"
                    min="0"
                    step="0.01"
                    disabled={!selectedClientId}
                    value={lengthValue}
                    onChange={(event) => setLengthValue(event.target.value)}
                    placeholder="Ex: 4.20"
                    className="soft-input w-full rounded-xl px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>

                <div>
                  <label
                    htmlFor="width"
                    className="mb-1.5 block text-sm font-medium text-blue-50"
                  >
                    Largeur (m)
                  </label>
                  <input
                    id="width"
                    type="number"
                    min="0"
                    step="0.01"
                    disabled={!selectedClientId}
                    value={widthValue}
                    onChange={(event) => setWidthValue(event.target.value)}
                    placeholder="Ex: 3.80"
                    className="soft-input w-full rounded-xl px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>
              </div>

              <div>
                <p className="mb-1.5 block text-sm font-medium text-blue-50">
                  Photo de la pièce
                </p>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoChange}
                  className="text-sm text-blue-100 file:mr-3 file:rounded-lg file:border file:border-white/30 file:bg-white/20 file:px-3 file:py-2 file:text-blue-50 file:backdrop-blur-sm"
                />
                <button
                  type="button"
                  onClick={openPhotoPicker}
                  disabled={!selectedClientId}
                  className="glass-card hover-lift mt-3 rounded-xl px-4 py-2 text-sm font-semibold text-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Prendre une photo
                </button>
                {roomPhotoBase64 ? (
                  <img
                    src={roomPhotoBase64}
                    alt="Aperçu de la pièce"
                    className="mt-3 h-36 w-full rounded-lg border border-white/35 object-cover sm:h-40"
                  />
                ) : (
                  <p className="mt-2 text-sm text-blue-100/80">Aucune photo</p>
                )}
              </div>

              <div className="rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-sm text-blue-50">
                Formule : {currentLength || 0} × {currentWidth || 0} ={" "}
                <span className="font-semibold">{currentSurface.toFixed(2)} m²</span>
              </div>

              {errorMessage ? (
                <p className="rounded-lg border border-red-200/40 bg-red-500/20 px-3 py-2 text-sm font-medium text-red-100">
                  {errorMessage}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={!selectedClientId}
                className="premium-btn w-full rounded-xl px-4 py-3 font-semibold active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Calculer / Ajouter la pièce
              </button>
            </form>
          </section>

          <section className="glass-card hover-lift fade-in-delay flex min-h-[420px] flex-col rounded-3xl p-6 sm:p-8">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-2xl font-semibold text-white">Pièces ajoutées</h2>
              <button
                type="button"
                onClick={handleClearAll}
                disabled={rooms.length === 0}
                className="glass-card hover-lift rounded-lg px-3 py-2 text-sm font-medium text-blue-50 transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                Vider tout
              </button>
            </div>

            <div className="flex-1">
              {rooms.length === 0 ? (
                <p className="rounded-xl border border-dashed border-white/35 bg-white/10 px-4 py-6 text-sm text-blue-100">
                  Aucune pièce ajoutée pour le moment.
                </p>
              ) : (
                <ul className="space-y-3">
                  {rooms.map((room) => {
                    const roomSurface = getRoomSurface(room);

                    return (
                      <li
                        key={room.id}
                        className="hover-lift flex flex-col gap-3 rounded-xl border border-white/30 bg-white/15 p-4 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-base font-semibold text-white">
                            {room.name}
                          </p>
                          <p className="text-sm text-blue-100/90">
                            {room.length} × {room.width} ={" "}
                            <span className="font-semibold text-white">
                              {roomSurface.toFixed(2)} m²
                            </span>
                          </p>
                          {room.photoBase64 ? (
                            <img
                              src={room.photoBase64}
                              alt={`Photo ${room.name}`}
                              className="mt-3 h-24 w-full rounded-lg border border-white/35 object-cover sm:h-20 sm:w-32"
                            />
                          ) : (
                            <p className="mt-2 text-sm text-blue-100/75">Aucune photo</p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteRoom(room.id)}
                          className="rounded-lg border border-red-200/50 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-100 transition hover:bg-red-500/20"
                        >
                          Supprimer
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="premium-btn mt-6 rounded-2xl px-4 py-4 text-white">
              <p className="text-sm uppercase tracking-wide text-blue-100/90">Total m²</p>
              <p className="text-3xl font-bold">{totalSurface.toFixed(2)} m²</p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
