import React from "react";

const IndicacoesTab = () => {
  return (
    <div style={{ padding: "20px" }}>
      <h2 style={{ marginBottom: "20px" }}>Indicações</h2>

      {/* BOTÃO DE DISPARO */}
      <div style={{ marginBottom: "20px" }}>
        <button
          style={{
            padding: "10px 20px",
            borderRadius: "8px",
            background: "#2563eb",
            color: "#fff",
            border: "none",
            cursor: "pointer",
          }}
        >
          Disparar Mensagem
        </button>
      </div>

      {/* LISTA DE MODELOS */}
      <div style={{ marginBottom: "20px" }}>
        <label>Modelo de mensagem:</label>
        <select
          style={{
            display: "block",
            marginTop: "8px",
            padding: "10px",
            borderRadius: "8px",
            width: "300px",
          }}
        >
          <option>Carregando modelos...</option>
        </select>
      </div>

      {/* ÚLTIMA MENSAGEM */}
      <div>
        <label>Última mensagem enviada:</label>
        <div
          style={{
            marginTop: "8px",
            padding: "10px",
            borderRadius: "8px",
            background: "#1f2937",
            color: "#fff",
          }}
        >
          Nenhuma mensagem enviada ainda.
        </div>
      </div>
    </div>
  );
};

export default IndicacoesTab;