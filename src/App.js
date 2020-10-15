import React, { Component } from 'react';
import './style/App.css';
// Views
import PitchTimeChart from './components/PitchTimeChart';
// API, data etc.
import MidiInputManager from './lib/MidiInputManager';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGithub } from '@fortawesome/free-brands-svg-icons';

export default class App extends Component {

    constructor(props) {
        super(props);
        // Setup MIDI input
        new MidiInputManager(
            this.getMidiLiveData,
            this.setMidiLiveData,
            this.addCurrentNote,
            this.removeCurrentNote
        );
        this.state = {
            viewSize: {
                outerWidth: 800,
                outerHeight: 600
            },
            midiLiveData: []
        };
    }

    componentDidMount() {
        // Scale layout to current screen size
        window.addEventListener('resize', this.onResize, false);
        this.onResize();
    }

    /**
     * Updates the size state when the window size changes
     * so views can react and redraw
     */
    onResize = () => {
        this.setState({
            viewSize: {
                outerWidth: Math.floor(window.innerWidth - 20),
                outerHeight: Math.floor(window.innerHeight - 100)
            }
        });
    }

    getMidiLiveData = () => this.state.midiLiveData;

    /**
     * Setter for MIDI input from an instrumetn
     * @param {Note[]} data array with notes
     */
    setMidiLiveData = (data) => {
        // Work-around so note_off event handling can immediately find the note_on event
        // eslint-disable-next-line
        this.state.midiLiveData = data;
        this.setState({ midiLiveData: data });
    };

    /**
     * Adds a note that is currently played (e.g. keyboard key pressed)
     * @param {Note} note a note
     */
    addCurrentNote = (note) => {
        const newMap = new Map(this.state.currentNotes);
        newMap.set(note.pitch, note);
        this.setState({ currentNotes: newMap });
    }

    /**
     * Removes a currently played note (e.g. keyboard key no longer pressed)
     * @param {number} pitch pitch of the note to remove
     */
    removeCurrentNote = (pitch) => {
        const newMap = new Map(this.state.currentNotes);
        newMap.delete(pitch);
        this.setState({ currentNotes: newMap });
    }

    render() {
        const s = this.state;
        return (
            <div className={`App dark`} >
                <PitchTimeChart
                    name='Note-Time Chart'
                    viewSize={s.viewSize}
                    midiLiveData={s.midiLiveData}
                />
                <div className='githubLink'>
                    <a href='https://github.com/fheyen/midi-live-vis'>
                        <FontAwesomeIcon icon={faGithub} />&nbsp;
                        https://github.com/fheyen/midi-live-vis
                    </a>
                </div>
            </div >
        );
    }
}
