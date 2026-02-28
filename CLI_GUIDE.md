# SOMA CLI Guide

**Version:** 1.0.0
**Created:** February 5, 2026

---

## 🚀 Quick Start

### Installation

The CLI is already installed with SOMA. To use it:

```bash
# Make sure backend is running
npm run backend

# Run CLI in another terminal
npm run cli

# Or use directly (after npm link)
soma-cli
```

### Link CLI Globally (Optional)

```bash
npm link
# Now you can use 'soma-cli' from anywhere
```

---

## 📖 Command Reference

### Goals Management

Interact with SOMA's autonomous goal planning system.

```bash
# List all goals
soma-cli goals list

# Show active goals only
soma-cli goals active

# Show completed goals
soma-cli goals completed

# Get goal status by ID
soma-cli goals status --id <goal-id>

# Create a new goal
soma-cli goals create --title "Learn React" --priority high

# Trigger autonomous goal generation
soma-cli goals autonomous
```

**Available Options:**
- `--id <string>` - Goal ID
- `--title <string>` - Goal title
- `--priority <low|medium|high|urgent>` - Goal priority

---

### Autonomous Research

Control SOMA's research and knowledge acquisition systems.

```bash
# Start research on a topic
soma-cli research start --topic "quantum computing"

# Get research status
soma-cli research status

# View research history
soma-cli research history

# Check worker pool status
soma-cli research workers

# Configure research settings
soma-cli research config --depth 3 --priority high
```

**Available Options:**
- `--topic <string>` - Research topic
- `--depth <number>` - Crawl depth (1-5)
- `--priority <low|medium|high>` - Research priority

---

### Skill Acquisition

Manage SOMA's skill learning and practice system.

```bash
# List all skills with proficiency levels
soma-cli skills list

# Show only certified skills (>85% proficiency)
soma-cli skills certified

# Show skills needing practice
soma-cli skills degraded

# View knowledge gaps from failures
soma-cli skills gaps

# Start practice session for a skill
soma-cli skills practice --skill "JavaScript"

# Learn a new skill/topic
soma-cli skills learn --topic "TypeScript"

# Show learning progress for a skill
soma-cli skills progress --skill "React"
```

**Available Options:**
- `--skill <string>` - Skill name
- `--topic <string>` - Learning topic

---

### Scheduling & Rhythms

Control SOMA's autonomous scheduling system.

```bash
# List all scheduled rhythms
soma-cli schedule list

# Show next scheduled event
soma-cli schedule next

# Check system load status
soma-cli schedule load

# Add a new rhythm (cron format)
soma-cli schedule add --cron "0 2 * * *" --action "memory_consolidation"

# Pause a rhythm
soma-cli schedule pause --rhythm <rhythm-id>

# Resume a rhythm
soma-cli schedule resume --rhythm <rhythm-id>

# Manually trigger a rhythm
soma-cli schedule trigger --rhythm <rhythm-id>

# Optimize schedules based on load
soma-cli schedule optimize
```

**Available Options:**
- `--rhythm <string>` - Rhythm ID
- `--cron <string>` - Cron pattern (e.g., "0 2 * * *")

---

### Codebase Analysis

Analyze and improve SOMA's own codebase.

```bash
# Trigger full codebase scan
soma-cli codebase scan

# Show code health metrics
soma-cli codebase health

# View improvement opportunities
soma-cli codebase opportunities

# Get AI-generated insights
soma-cli codebase insights

# Show detected patterns
soma-cli codebase patterns

# Show dependency analysis
soma-cli codebase dependencies
```

---

### User Prediction & Anticipation

Interact with SOMA's predictive systems.

```bash
# Predict user's next action
soma-cli predict next

# Get contextual prediction
soma-cli predict context --text "I want to build a..."

# Get proactive suggestions (shortcut)
soma-cli suggest

# Analyze user patterns
soma-cli learn-patterns

# Show learned user profile
soma-cli user-profile

# Toggle anticipation mode
soma-cli anticipate on
soma-cli anticipate off
```

**Available Options:**
- `--text <string>` - Context text for prediction

---

### System Status

Check SOMA's overall system status.

```bash
# Show system status
soma-cli status

# Show detailed status with recent commands
soma-cli status --detailed

# Show performance metrics
soma-cli metrics

# Health check all systems
soma-cli health
```

---

## 🎮 Interactive Mode

Enter interactive mode for a REPL-like experience:

```bash
# Start interactive mode
soma-cli

# Or explicitly
soma-cli interactive
```

### Interactive Commands

Once in interactive mode, you can use shortened commands:

```
soma> goals:list
soma> research:start quantum computing
soma> skills:gaps
soma> suggest
soma> help
soma> exit
```

### Interactive Features

- **Command History**: Use ↑/↓ arrow keys
- **Tab Completion**: Coming soon
- **Syntax Highlighting**: Color-coded output
- **Auto-suggestions**: Based on usage patterns

---

## 🔔 Notifications

When the backend is running, the CLI receives real-time notifications:

- `🎯 New goal created: <title>`
- `✅ Goal completed: <title>`
- `⚠️ Skill degraded: <skill> (<proficiency>%)`
- `📚 Knowledge acquired: <topic>`
- `🔬 Research complete: <topic>`

---

## 🛠️ Configuration

### Environment Variables

```bash
# CLI configuration (optional)
SOMA_CLI_COLOR=true          # Enable colors
SOMA_CLI_NOTIFICATIONS=true  # Enable notifications
SOMA_CLI_HISTORY_SIZE=1000   # Command history size
```

### Backend Connection

The CLI connects to the SOMA backend via MessageBroker. Ensure the backend is running on the default port.

---

## 📚 Examples

### Daily Workflow

```bash
# Morning - Check overnight learning
soma-cli research history --since yesterday
soma-cli goals list

# Start autonomous mode
soma-cli mode autonomous

# Set up research for tonight
soma-cli research start --topic "AI safety" --priority high

# Check skills that need practice
soma-cli skills degraded

# Get suggestions for today
soma-cli suggest
```

### Research Session

```bash
# Start research on multiple topics
soma-cli research start --topic "quantum computing"
soma-cli research start --topic "AGI safety"
soma-cli research start --topic "neural architecture"

# Monitor progress
soma-cli research status

# Check results
soma-cli research history
```

### Goal Management

```bash
# Create a learning goal
soma-cli goals create --title "Master TypeScript" --priority high

# Let SOMA generate autonomous goals
soma-cli goals autonomous

# Track progress
soma-cli goals active

# Complete a goal
soma-cli goals complete --id <goal-id>
```

---

## 🐛 Troubleshooting

### CLI Not Connecting

```bash
# Check backend status
npm run health

# Restart backend
npm run restart

# Check MessageBroker logs
# (backend logs will show connection attempts)
```

### Command Not Found

```bash
# Run via npm script
npm run cli goals list

# Or link globally
npm link
```

### Import Errors

```bash
# Reinstall dependencies
npm install

# Clear node cache
npm cache clean --force
npm install
```

---

## 🚀 Advanced Usage

### Scripting with CLI

```bash
#!/bin/bash
# daily-research.sh

# Set topics
topics=("quantum computing" "AGI" "neural networks")

# Start research on all topics
for topic in "${topics[@]}"; do
  soma-cli research start --topic "$topic" --priority high
done

# Check status
soma-cli research status
```

### Integration with Cron

```bash
# Add to crontab
0 1 * * * /path/to/soma-cli research start --topic "AI news"
0 8 * * * /path/to/soma-cli goals autonomous
```

---

## 📝 Development Notes

### Architecture

```
CLI Entry Point (soma-cli.mjs)
    ↓
CliArbiter (routes commands)
    ↓
MessageBroker (event bus)
    ↓
Target Arbiters (execute commands)
    ↓
Response Formatters (format output)
    ↓
Terminal Output
```

### Adding New Commands

To add a new command, edit:

1. `arbiters/CliArbiter.cjs` - Add command mapping
2. `cli/soma-cli.mjs` - Add yargs command definition
3. Target arbiter - Ensure it handles the message type

---

## 🎯 Roadmap

### Coming Soon

- [ ] Tab completion in interactive mode
- [ ] Real-time progress bars for long operations
- [ ] Command aliases and shortcuts
- [ ] Configuration file support (~/.somarc)
- [ ] Plugins system for custom commands
- [ ] TUI (Terminal UI) mode with blessed
- [ ] Voice command support
- [ ] Remote SOMA control (SSH/WebSocket)

---

## 📞 Support

For issues or questions:
- Check the main SOMA documentation
- Review backend logs for errors
- Ensure MessageBroker is functioning

---

**Built with:** Node.js, yargs, chalk, ora
**License:** MIT
**Author:** SOMA Team

**Ready to command SOMA from the terminal!** 🚀
