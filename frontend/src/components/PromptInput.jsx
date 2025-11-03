import { useState } from 'react'
import './PromptInput.css'

export default function PromptInput({ onDNAGenerated }) {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [dnaPreview, setDnaPreview] = useState(null)

  const examples = [
    'solar punk farmers with high eco scores',
    'cyberpunk hackers optimized for survival',
    'cooperative forest guardians',
    'aggressive wasteland raiders',
  ]

  const handleGenerate = async () => {
    if (!prompt.trim()) return
    
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('http://localhost:3001/api/gen-dna', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })
      
      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`)
      }
      
      const data = await response.json()
      setDnaPreview(data)
      
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = () => {
    if (dnaPreview) {
      onDNAGenerated(dnaPreview.packedDNA)
    }
  }

  return (
    <div className="prompt-input">
      <h2>🎨 Design Your AI Agents</h2>
      <p className="description">
        Describe the type of agents you want to create. Gemini AI will generate their genetic traits.
      </p>

      <div className="examples">
        <p className="examples-label">Try these:</p>
        {examples.map((ex, i) => (
          <button
            key={i}
            onClick={() => setPrompt(ex)}
            className="example-btn"
            disabled={loading}
          >
            {ex}
          </button>
        ))}
      </div>

      <div className="input-group">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g., 'solar punk farmers with high eco scores'"
          rows={3}
          disabled={loading}
          className="prompt-textarea"
        />
        <button
          onClick={handleGenerate}
          disabled={loading || !prompt.trim()}
          className="btn-primary"
        >
          {loading ? '🧬 Generating...' : '🧬 Generate DNA'}
        </button>
      </div>

      {error && (
        <div className="error-message">
          ⚠️ {error}
        </div>
      )}

      {dnaPreview && (
        <div className="dna-preview">
          <h3>🧬 DNA Preview</h3>
          <div className="traits-grid">
            <div className="trait">
              <span className="trait-label">Efficiency</span>
              <div className="trait-bar">
                <div 
                  className="trait-fill efficiency"
                  style={{ width: `${dnaPreview.traits.efficiency}%` }}
                />
              </div>
              <span className="trait-value">{dnaPreview.traits.efficiency}/100</span>
            </div>
            
            <div className="trait">
              <span className="trait-label">Cooperation</span>
              <div className="trait-bar">
                <div 
                  className="trait-fill cooperation"
                  style={{ width: `${dnaPreview.traits.cooperation}%` }}
                />
              </div>
              <span className="trait-value">{dnaPreview.traits.cooperation}/100</span>
            </div>
            
            <div className="trait">
              <span className="trait-label">Aggression</span>
              <div className="trait-bar">
                <div 
                  className="trait-fill aggression"
                  style={{ width: `${dnaPreview.traits.aggression}%` }}
                />
              </div>
              <span className="trait-value">{dnaPreview.traits.aggression}/100</span>
            </div>
            
            <div className="trait">
              <span className="trait-label">🌍 Eco Score</span>
              <div className="trait-bar">
                <div 
                  className="trait-fill eco"
                  style={{ width: `${dnaPreview.traits.ecoScore}%` }}
                />
              </div>
              <span className="trait-value">{dnaPreview.traits.ecoScore}/100</span>
            </div>
          </div>

          <div className="dna-code">
            <code>{dnaPreview.packedDNA}</code>
          </div>

          <button onClick={handleConfirm} className="btn-primary btn-large">
            ✅ Confirm & Mint Swarm
          </button>
        </div>
      )}
    </div>
  )
}
