import './LoadingOverlay.css'

export default function LoadingOverlay({ roundNumber, disaster }) {
  return (
    <div className="loading-overlay">
      <div className="loading-content">
        {/* Logo/Branding */}
        <div className="game-logo">
          <div className="logo-icon">⚔️</div>
          <h1 className="logo-text">AgentForge</h1>
          <p className="logo-tagline">AI Battle Royale</p>
        </div>

        {/* Round Info */}
        <div className="round-info">
          <h2 className="round-title">Round {roundNumber}/3</h2>
          {disaster && (
            <div className="disaster-announcement">
              <div className="disaster-icon-large">⚠️</div>
              <h3 className="disaster-title">{disaster} DISASTER!</h3>
              <p className="disaster-subtitle">Your agents are in danger...</p>
            </div>
          )}
        </div>

        {/* Loading Animation */}
        <div className="ai-processing">
          <div className="processing-dots">
            <span className="dot"></span>
            <span className="dot"></span>
            <span className="dot"></span>
          </div>
          <p className="processing-text">AI analyzing agent DNA...</p>
          <p className="processing-subtext">Making strategic survival decisions</p>
        </div>

        {/* Progress Bar */}
        <div className="progress-container">
          <div className="progress-bar"></div>
        </div>

        <p className="loading-tip">💡 Each agent's unique traits determine their survival chances</p>
      </div>
    </div>
  )
}
