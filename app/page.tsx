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
const CLIENTS_STORAGE_KEY = "clients-m2-calculator";
const ROOMS_BY_CLIENT_STORAGE_KEY = "rooms-by-client-m2-calculator";
const SELECTED_CLIENT_STORAGE_KEY = "selected-client-m2-calculator";
const AUTH_STORAGE_KEY = "m2-authenticated";
const DEFAULT_PASSWORD = "1234";

export default function Home() {
  const [passwordInput, setPasswordInput] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");
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
    const storedAuth = window.localStorage.getItem(AUTH_STORAGE_KEY);
    setIsAuthenticated(storedAuth === "true");
  }, []);

  useEffect(() => {
    const rawClients = window.localStorage.getItem(CLIENTS_STORAGE_KEY);
    const rawRoomsByClient = window.localStorage.getItem(ROOMS_BY_CLIENT_STORAGE_KEY);
    const rawSelectedClient = window.localStorage.getItem(SELECTED_CLIENT_STORAGE_KEY);
    const rawLegacyRooms = window.localStorage.getItem(LEGACY_ROOMS_STORAGE_KEY);

    try {
      const parsedClients = rawClients ? (JSON.parse(rawClients) as Client[]) : [];
      const parsedRoomsByClient = rawRoomsByClient
        ? (JSON.parse(rawRoomsByClient) as Record<string, Room[]>)
        : {};

      if (Array.isArray(parsedClients)) {
        setClients(parsedClients);
      }

      if (parsedRoomsByClient && typeof parsedRoomsByClient === "object") {
        setRoomsByClient(parsedRoomsByClient);
      }

      if (rawSelectedClient && typeof rawSelectedClient === "string") {
        setSelectedClientId(rawSelectedClient);
      }

      const noClientData = !rawClients && parsedClients.length === 0;
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
      window.localStorage.removeItem(CLIENTS_STORAGE_KEY);
      window.localStorage.removeItem(ROOMS_BY_CLIENT_STORAGE_KEY);
      window.localStorage.removeItem(SELECTED_CLIENT_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(clients));
  }, [clients]);

  useEffect(() => {
    window.localStorage.setItem(
      ROOMS_BY_CLIENT_STORAGE_KEY,
      JSON.stringify(roomsByClient),
    );
  }, [roomsByClient]);

  useEffect(() => {
    window.localStorage.setItem(SELECTED_CLIENT_STORAGE_KEY, selectedClientId);
  }, [selectedClientId]);

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

  const fileToBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
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
      const base64Image = await fileToBase64(selectedFile);
      setRoomPhotoBase64(base64Image);
      setErrorMessage("");
    } catch {
      setErrorMessage("La photo n'a pas pu être chargée.");
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

  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (passwordInput === DEFAULT_PASSWORD) {
      setIsAuthenticated(true);
      window.localStorage.setItem(AUTH_STORAGE_KEY, "true");
      setAuthError("");
      setPasswordInput("");
      return;
    }

    setAuthError("Mot de passe incorrect.");
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    setAuthError("");
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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 px-4 py-8 sm:px-6 sm:py-10">
        <main className="mx-auto w-full max-w-md">
          <section className="rounded-3xl border border-blue-100 bg-white p-6 shadow-[0_12px_40px_-20px_rgba(37,99,235,0.45)] sm:p-8">
            <h1 className="text-3xl font-bold tracking-tight text-blue-900">
              Connexion
            </h1>
            <p className="mt-2 text-sm text-blue-700">
              Entrez le mot de passe pour accéder au calculateur.
            </p>

            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-sm font-medium text-blue-900"
                >
                  Mot de passe
                </label>
                <input
                  id="password"
                  type="password"
                  value={passwordInput}
                  onChange={(event) => setPasswordInput(event.target.value)}
                  className="w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-blue-950 outline-none ring-blue-400/80 transition focus:border-blue-300 focus:ring-2"
                />
              </div>

              {authError ? (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
                  {authError}
                </p>
              ) : null}

              <button
                type="submit"
                className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white shadow-md shadow-blue-300/40 transition hover:bg-blue-700 active:scale-[0.99]"
              >
                Entrer
              </button>
            </form>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 px-4 py-8 sm:px-6 sm:py-10">
      <main className="mx-auto w-full max-w-6xl">
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-medium text-blue-800 shadow-sm transition hover:bg-blue-50"
          >
            Déconnexion
          </button>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
          <section className="rounded-3xl border border-blue-100 bg-white p-6 shadow-[0_12px_40px_-20px_rgba(37,99,235,0.45)] sm:p-8">
            <h1 className="text-3xl font-bold tracking-tight text-blue-900 sm:text-4xl">
              Calculateur de m²
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-blue-700 sm:text-base">
              Ajoutez chaque pièce pour obtenir la surface totale de votre projet.
            </p>

            <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/50 p-4 sm:p-5">
              <p className="text-sm font-semibold text-blue-900">Nom du client</p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  value={clientName}
                  onChange={(event) => setClientName(event.target.value)}
                  placeholder="Ex: M. Dupont"
                  className="w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-blue-950 outline-none ring-blue-400/80 transition placeholder:text-blue-300 focus:border-blue-300 focus:ring-2"
                />
                <button
                  type="button"
                  onClick={handleAddClient}
                  className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-blue-300/40 transition hover:bg-blue-700"
                >
                  Ajouter le client
                </button>
              </div>

              <label
                htmlFor="clientSelect"
                className="mt-4 block text-sm font-semibold text-blue-900"
              >
                Choisir un client
              </label>
              <select
                id="clientSelect"
                value={selectedClientId}
                onChange={(event) => setSelectedClientId(event.target.value)}
                className="mt-2 w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-blue-950 outline-none ring-blue-400/80 transition focus:border-blue-300 focus:ring-2"
              >
                <option value="">-- Sélectionner --</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>

              <div className="mt-3 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-blue-800">
                  Client sélectionné :{" "}
                  <span className="font-semibold text-blue-900">
                    {selectedClient?.name ?? "Aucun"}
                  </span>
                </p>
                <button
                  type="button"
                  onClick={handleDeleteSelectedClient}
                  disabled={!selectedClientId}
                  className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Supprimer client
                </button>
              </div>
            </div>

            <form onSubmit={handleAddRoom} className="mt-7 space-y-5">
              <div>
                <label
                  htmlFor="roomName"
                  className="mb-1.5 block text-sm font-medium text-blue-900"
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
                    className="w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-blue-950 outline-none ring-blue-400/80 transition placeholder:text-blue-300 focus:border-blue-300 focus:ring-2 disabled:cursor-not-allowed disabled:bg-blue-50/60 disabled:text-blue-400"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="length"
                    className="mb-1.5 block text-sm font-medium text-blue-900"
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
                    className="w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-blue-950 outline-none ring-blue-400/80 transition placeholder:text-blue-300 focus:border-blue-300 focus:ring-2 disabled:cursor-not-allowed disabled:bg-blue-50/60 disabled:text-blue-400"
                  />
                </div>

                <div>
                  <label
                    htmlFor="width"
                    className="mb-1.5 block text-sm font-medium text-blue-900"
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
                    className="w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-blue-950 outline-none ring-blue-400/80 transition placeholder:text-blue-300 focus:border-blue-300 focus:ring-2 disabled:cursor-not-allowed disabled:bg-blue-50/60 disabled:text-blue-400"
                  />
                </div>
              </div>

              <div>
                <p className="mb-1.5 block text-sm font-medium text-blue-900">
                  Photo de la pièce
                </p>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoChange}
                />
                <button
                  type="button"
                  onClick={openPhotoPicker}
                  disabled={!selectedClientId}
                  className="mt-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-800 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Prendre une photo
                </button>
                {roomPhotoBase64 ? (
                  <img
                    src={roomPhotoBase64}
                    alt="Aperçu de la pièce"
                    className="mt-3 h-36 w-full rounded-lg border border-blue-100 object-cover sm:h-40"
                  />
                ) : (
                  <p className="mt-2 text-sm text-blue-500">Aucune photo</p>
                )}
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                Formule : {currentLength || 0} × {currentWidth || 0} ={" "}
                <span className="font-semibold">{currentSurface.toFixed(2)} m²</span>
              </div>

              {errorMessage ? (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
                  {errorMessage}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={!selectedClientId}
                className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white shadow-md shadow-blue-300/40 transition hover:bg-blue-700 active:scale-[0.99]"
              >
                Calculer / Ajouter la pièce
              </button>
            </form>
          </section>

          <section className="flex min-h-[420px] flex-col rounded-3xl border border-blue-100 bg-white p-6 shadow-[0_12px_40px_-20px_rgba(37,99,235,0.45)] sm:p-8">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-2xl font-semibold text-blue-900">Pièces ajoutées</h2>
              <button
                type="button"
                onClick={handleClearAll}
                disabled={rooms.length === 0}
                className="rounded-lg border border-blue-200 px-3 py-2 text-sm font-medium text-blue-800 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Vider tout
              </button>
            </div>

            <div className="flex-1">
              {rooms.length === 0 ? (
                <p className="rounded-xl border border-dashed border-blue-200 bg-blue-50/60 px-4 py-6 text-sm text-blue-700">
                  Aucune pièce ajoutée pour le moment.
                </p>
              ) : (
                <ul className="space-y-3">
                  {rooms.map((room) => {
                    const roomSurface = getRoomSurface(room);

                    return (
                      <li
                        key={room.id}
                        className="flex flex-col gap-3 rounded-xl border border-blue-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-base font-semibold text-blue-950">
                            {room.name}
                          </p>
                          <p className="text-sm text-blue-700">
                            {room.length} × {room.width} ={" "}
                            <span className="font-semibold text-blue-900">
                              {roomSurface.toFixed(2)} m²
                            </span>
                          </p>
                          {room.photoBase64 ? (
                            <img
                              src={room.photoBase64}
                              alt={`Photo ${room.name}`}
                              className="mt-3 h-24 w-full rounded-lg border border-blue-100 object-cover sm:h-20 sm:w-32"
                            />
                          ) : (
                            <p className="mt-2 text-sm text-blue-500">Aucune photo</p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteRoom(room.id)}
                          className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                        >
                          Supprimer
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="mt-6 rounded-2xl bg-blue-600 px-4 py-4 text-white">
              <p className="text-sm uppercase tracking-wide text-blue-100">Total m²</p>
              <p className="text-3xl font-bold">{totalSurface.toFixed(2)} m²</p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
