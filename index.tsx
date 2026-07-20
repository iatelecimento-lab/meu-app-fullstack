import React, { useEffect, useState, useRef } from 'react';
import { supabase } from './supabaseClient';
import { User } from '@supabase/supabase-js';
import { gerarRespostaIA } from './groqClient';

interface Mensagem {
  id: number;
  texto: string;
  user_id: string;
  created_at?: string;
}

interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [modoCadastro, setModoCadastro] = useState(false);
  const [mensagemAuth, setMensagemAuth] = useState('');

  // Estado para Notas
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [novoTexto, setNovoTexto] = useState('');
  const [idEditando, setIdEditando] = useState<number | null>(null);
  const [textoEditado, setTextoEditado] = useState('');
  const [carregando, setCarregando] = useState(false);

  // Estado para Chat com IA
  const [abaAtiva, setAbaAtiva] = useState<'notas' | 'chat'>('notas');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatCarregando, setChatCarregando] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // 1. Checar Usuário Logado
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // 2. Carregar Mensagens quando o usuário estiver logado
  useEffect(() => {
    if (user) {
      buscarMensagens();
    }
  }, [user]);

  // Scroll automático para o final do chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Autenticação: Login / Cadastro
  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setMensagemAuth('');

    if (modoCadastro) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setMensagemAuth(`Erro: ${error.message}`);
      else setMensagemAuth('Cadastro realizado! Faça login.');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMensagemAuth(`Erro: ${error.message}`);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setMensagens([]);
    setChatMessages([]);
  }

  // CRUD de Notas
  async function buscarMensagens() {
    setCarregando(true);
    const { data, error } = await supabase
      .from('mensagens')
      .select('*')
      .order('id', { ascending: false });

    if (error) console.error('Erro ao buscar:', error);
    else if (data) setMensagens(data);
    setCarregando(false);
  }

  async function salvarMensagem() {
    if (!novoTexto.trim() || !user) return;

    const { error } = await supabase
      .from('mensagens')
      .insert([{ texto: novoTexto, user_id: user.id }]);

    if (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar. Verifique se a coluna user_id existe no Supabase.');
    } else {
      setNovoTexto('');
      buscarMensagens();
    }
  }

  async function deletarMensagem(id: number) {
    const { error } = await supabase
      .from('mensagens')
      .delete()
      .eq('id', id);

    if (error) console.error('Erro ao deletar:', error);
    else buscarMensagens();
  }

  async function salvarEdicao(id: number) {
    const { error } = await supabase
      .from('mensagens')
      .update({ texto: textoEditado })
      .eq('id', id);

    if (error) {
      console.error('Erro ao editar:', error);
    } else {
      setIdEditando(null);
      setTextoEditado('');
      buscarMensagens();
    }
  }

  // Lógica do Chat IA
  async function enviarMensagemChat() {
    if (!chatInput.trim()) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatCarregando(true);

    const resposta = await gerarRespostaIA(userMessage);
    
    setChatMessages(prev => [...prev, { role: 'ai', content: resposta }]);
    setChatCarregando(false);
  }

  // Estilos inline
  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    backgroundColor: '#0f172a',
    color: '#f8fafc',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    padding: '20px',
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    padding: '30px',
    width: '100%',
    maxWidth: '480px',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
    border: '1px solid #334155',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #475569',
    backgroundColor: '#0f172a',
    color: '#fff',
    marginBottom: '12px',
    boxSizing: 'border-box',
    outline: 'none',
  };

  const buttonStyle: React.CSSProperties = {
    padding: '12px 20px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#3b82f6',
    color: '#fff',
    fontWeight: 'bold',
    cursor: 'pointer',
    width: '100%',
    transition: 'background 0.2s',
  };

  const tabStyle = (ativa: boolean): React.CSSProperties => ({
    padding: '10px 20px',
    cursor: 'pointer',
    backgroundColor: ativa ? '#3b82f6' : 'transparent',
    color: ativa ? '#fff' : '#94a3b8',
    borderBottom: ativa ? '2px solid #60a5fa' : 'none',
    fontWeight: ativa ? 'bold' : 'normal',
    flex: 1,
    textAlign: 'center',
    borderRadius: ativa ? '8px 8px 0 0' : '0',
  });

  // Se o usuário NÃO estiver logado:
  if (!user) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <h2 style={{ textAlign: 'center', marginTop: 0, color: '#60a5fa' }}>
            {modoCadastro ? 'Criar Conta 🚀' : 'Entrar no App 🔐'}
          </h2>
          <form onSubmit={handleAuth}>
            <input
              type="email"
              placeholder="Seu e-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
              required
            />
            <input
              type="password"
              placeholder="Sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
              required
            />
            <button type="submit" style={buttonStyle}>
              {modoCadastro ? 'Cadastrar' : 'Entrar'}
            </button>
          </form>

          {mensagemAuth && (
            <p style={{ textAlign: 'center', color: '#f87171', fontSize: '14px', marginTop: '12px' }}>
              {mensagemAuth}
            </p>
          )}

          <p
            onClick={() => {
              setModoCadastro(!modoCadastro);
              setMensagemAuth('');
            }}
            style={{
              textAlign: 'center',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: '14px',
              marginTop: '16px',
              textDecoration: 'underline',
            }}
          >
            {modoCadastro ? 'Já tem conta? Faça Login' : 'Não tem conta? Cadastre-se'}
          </p>
        </div>
      </div>
    );
  }

  // Se o usuário ESTIVER logado:
  return (
    <div style={containerStyle}>
      <div style={{ ...cardStyle, maxWidth: '800px', height: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
          <div>
            <h3 style={{ margin: 0, color: '#60a5fa' }}>⚡ Estúdio de Desenvolvimento</h3>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>{user.email}</span>
          </div>
          <button
            onClick={handleLogout}
            style={{
              backgroundColor: '#ef4444',
              color: '#fff',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            Sair
          </button>
        </div>

        {/* Abas */}
        <div style={{ display: 'flex', marginBottom: '20px', borderBottom: '1px solid #334155' }}>
          <div style={tabStyle(abaAtiva === 'notas')} onClick={() => setAbaAtiva('notas')}>📝 Notas</div>
          <div style={tabStyle(abaAtiva === 'chat')} onClick={() => setAbaAtiva('chat')}>🤖 Chat IA (Groq)</div>
        </div>

        {/* Conteúdo Aba Notas */}
        {abaAtiva === 'notas' && (
          <div style={{ flex: 1, overflowY: 'auto', paddingRight: '10px' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
              <input
                type="text"
                placeholder="Digite algo importante..."
                value={novoTexto}
                onChange={(e) => setNovoTexto(e.target.value)}
                style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
              />
              <button
                onClick={salvarMensagem}
                style={{ ...buttonStyle, width: 'auto', backgroundColor: '#10b981' }}
              >
                Salvar
              </button>
            </div>

            {carregando ? (
              <p style={{ textAlign: 'center', color: '#94a3b8' }}>Carregando suas notas...</p>
            ) : mensagens.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#64748b' }}>Nenhuma nota salva ainda.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {mensagens.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      backgroundColor: '#0f172a',
                      padding: '14px',
                      borderRadius: '8px',
                      border: '1px solid #334155',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    {idEditando === item.id ? (
                      <div style={{ display: 'flex', gap: '6px', width: '100%' }}>
                        <input
                          type="text"
                          value={textoEditado}
                          onChange={(e) => setTextoEditado(e.target.value)}
                          style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
                        />
                        <button
                          onClick={() => salvarEdicao(item.id)}
                          style={{ ...buttonStyle, width: 'auto', backgroundColor: '#10b981', padding: '6px 12px' }}
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => setIdEditando(null)}
                          style={{ ...buttonStyle, width: 'auto', backgroundColor: '#64748b', padding: '6px 12px' }}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <>
                        <span style={{ color: '#e2e8f0', wordBreak: 'break-word', paddingRight: '10px' }}>
                          {item.texto}
                        </span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => {
                              setIdEditando(item.id);
                              setTextoEditado(item.texto);
                            }}
                            style={{
                              backgroundColor: '#f59e0b',
                              color: '#fff',
                              border: 'none',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '12px',
                            }}
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => deletarMensagem(item.id)}
                            style={{
                              backgroundColor: '#ef4444',
                              color: '#fff',
                              border: 'none',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '12px',
                            }}
                          >
                            Apagar
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Conteúdo Aba Chat IA */}
        {abaAtiva === 'chat' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px', backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #334155', marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {chatMessages.length === 0 ? (
                <div style={{ margin: 'auto', textAlign: 'center', color: '#64748b' }}>
                  <p>🤖 Olá! Sou a IA Llama-3 rodando via Groq.</p>
                  <p>Como posso te ajudar hoje?</p>
                </div>
              ) : (
                chatMessages.map((msg, index) => (
                  <div key={index} style={{
                    alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    backgroundColor: msg.role === 'user' ? '#3b82f6' : '#1e293b',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    maxWidth: '80%',
                    border: msg.role === 'ai' ? '1px solid #475569' : 'none',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}>
                    {msg.content}
                  </div>
                ))
              )}
              {chatCarregando && (
                <div style={{ alignSelf: 'flex-start', backgroundColor: '#1e293b', padding: '10px 14px', borderRadius: '12px', border: '1px solid #475569' }}>
                  <span style={{ color: '#94a3b8' }}>Pensando...</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Pergunte algo à IA..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && enviarMensagemChat()}
                style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
              />
              <button
                onClick={enviarMensagemChat}
                disabled={chatCarregando}
                style={{ ...buttonStyle, width: 'auto', backgroundColor: '#8b5cf6', opacity: chatCarregando ? 0.7 : 1 }}
              >
                Enviar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
