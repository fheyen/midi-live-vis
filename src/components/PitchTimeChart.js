import React from 'react';
import { scaleLinear } from 'd3-scale';
import { extent, group } from 'd3-array';
import { axisBottom, axisLeft } from 'd3-axis';
import { select } from 'd3-selection';
import View from '../lib/ui/View';
import { schemeCategory10 } from 'd3-scale-chromatic';
import { drawNoteTrapezoid, setupCanvas, clipLeftRight } from '../lib/ui/Graphics';
import { Midi } from 'musicvis-lib';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faToggleOn, faToggleOff } from '@fortawesome/free-solid-svg-icons';


export default class PitchTimeChart extends View {

    constructor(props) {
        const margin = { top: 45, right: 30, bottom: 60, left: 65 };
        super(props, margin);
        this.state = {
            ...this.state,
            overviewHeight: 40,
            showAllTime: false,
            // pitch, note, drums
            yAxisLabelType: 'pitch',
            boxHeight: null,
            notes: [],
            liveNotes: [],
        };
    }

    componentDidMount = () => this.initialize();

    onResize = () => this.initialize();

    componentDidUpdate() {
        this.resizeComponent();
        // TODO: check if GT and rec have changed, if not only draw player time
        // if (this.state.initialized) {
        //     this.draw(this);
        // }
    }

    initialize = () => {
        const { width, height, yAxisLabelType } = this.state;
        const overviewHeight = height * 0.25;
        const svg = select(this.svg);
        svg.selectAll('*').remove();
        // Scales
        const x = scaleLinear().range([2, width]);
        const xOv = scaleLinear().range([2, width]);
        const y = scaleLinear().range([height, overviewHeight + 25]);
        const yOv = scaleLinear().range([overviewHeight, 0]);
        // Axes
        const xAxis = axisBottom(x);
        // TODO: allow to switch between MIDI nr and note name and drum label
        const yAxis = axisLeft(y);
        if (yAxisLabelType === 'note') {
            yAxis.tickFormat(d => Midi.getMidiNoteByNr(d)?.label);
        } else {
            yAxis.tickFormat(d => Math.floor(d));
        }
        const xAxisEl = svg.append('g')
            .attr('class', 'axis')
            .attr('transform', `translate(0, ${height})`)
            .call(xAxis);
        const yAxisEl = svg.append('g')
            .attr('class', 'axis')
            .call(yAxis);
        // Labels
        svg.append('text')
            .attr('class', 'yAxisLabel')
            .text('Pitch')
            .attr('transform', `rotate(90) translate(${(height + overviewHeight) / 2}, ${45})`);
        // Setup canvas rescaled to device pixel ratio
        setupCanvas(this.canvas);
        this.setState(
            { initialized: true, svg, x, xOv, y, yOv, xAxis, yAxis, xAxisEl, yAxisEl, overviewHeight },
            () => this.draw(this, 0)
        );
    }

    /**
     * Draws the note retangles.
     * @param {CanvasRenderingContext2D} ctx canvas rendering context
     * @param {Notes[]} notes notes with start, end, pitch
     * @param {number} boxHeight height of each pitch-line
     * @param {Function} x D3 linearScale x scale
     * @param {Function} y D3 linearScale y scale
     */
    drawNotes = (ctx, notes, boxHeight, x, y, end) => {
        const { width, margin } = this.state;
        const veloScale = scaleLinear()
            .domain([0, 127])
            .range([boxHeight * 0.1, boxHeight]);
        for (let note of notes) {
            const startPos = x(note.start);
            const noteEnd = note.end === null ? end : note.end;
            const endPos = x(noteEnd);
            // Do not draw invisible notes
            if (endPos < 0 || startPos > width) {
                continue;
            }
            const xPos = margin.left + startPos;
            const h = veloScale(note.velocity);
            const yPos = margin.top + y(note.pitch) - h / 2;
            const w = Math.max(endPos - startPos, 1);
            drawNoteTrapezoid(ctx, xPos, yPos, w, h, h / 2);
        }
    }

    /**
     * Main drawing function
     */
    draw = (_this, time) => {
        const { viewWidth, viewHeight, margin, width, height, overviewHeight, x, xOv, y, yOv, xAxis, yAxis, xAxisEl, yAxisEl, showAllTime } = _this.state;
        const { midiLiveData } = _this.props;
        const allNotes = midiLiveData;
        // Prepare main and highlight canvas
        const ctx = _this.canvas.getContext('2d');
        ctx.clearRect(0, 0, viewWidth, viewHeight);
        // Set x scale domain
        const end = time / 1000;
        const xDomain = [0, end];
        xOv.domain(xDomain);
        if (showAllTime) {
            // Show all notes
            x.domain(xDomain);
        } else {
            x.domain([end - 20, end]);
        }
        xAxisEl.call(xAxis);
        // Set y scale domain
        const [low, high] = extent(allNotes, d => d.pitch);
        y.domain([+low - 1, +high + 1]);
        yOv.domain([+low - 1, +high + 1]);
        yAxisEl.call(yAxis);
        // If only one track, use color for channels
        // and allow to only show a single channel
        const separatedByChannels = Array.from(group(allNotes, d => d.channel)).map(d => d[1]);
        // Draw notes onto canvas
        const colors = schemeCategory10;
        const boxHeight = height / (high - low + 3);
        const boxHeight2 = overviewHeight / (high - low + 1);
        separatedByChannels.forEach((tr, i) => {
            ctx.fillStyle = colors[i % colors.length];
            _this.drawNotes(ctx, tr, boxHeight, x, y, end);
            _this.drawNotes(ctx, tr, boxHeight2, xOv, yOv, end);
        });
        // Separator between overview and main visualization
        ctx.fillStyle = '#888';
        ctx.fillRect(margin.left, margin.top + overviewHeight + 12, width, 1);
        clipLeftRight(ctx, margin, width, height);
        requestAnimationFrame((time) => this.draw(this, time))
    }

    render() {
        const { viewWidth, viewHeight, margin } = this.state;
        return (
            <div
                className='View PitchTimeChart'
                style={{ gridArea: `span ${this.state.rowSpan} / span ${this.state.columnSpan}` }}
            >
                <canvas
                    className='ViewCanvas'
                    ref={n => this.canvas = n}
                    style={{ width: viewWidth, height: viewHeight }}
                />
                <svg
                    width={viewWidth}
                    height={viewHeight}
                >
                    <text
                        className='heading'
                        x={viewWidth / 2}
                        y={20}
                    >
                        Note-Time Chart for WebMIDI
                    </text>
                    <g
                        ref={n => this.svg = n}
                        transform={`translate(${margin.left}, ${margin.top})`}
                    />
                    <text
                        className='yAxisLabel'
                        x={viewWidth / 2}
                        y={viewHeight - 15}
                    >
                        Time in seconds
                    </text>
                </svg>
                <div className='viewControls'>
                    <div>
                        <select
                            title='Y-axis labels'
                            onChange={(e) => this.setState({ yAxisLabelType: e.target.value }, this.initialize)}
                        >
                            <option value='pitch'>MIDI note</option>
                            <option value='note'>Note name</option>
                        </select>
                    </div>
                    <div>
                        <button
                            title='Toggles between showing the whole time or last 20 seconds'
                            onClick={() => this.setState({ showAllTime: !this.state.showAllTime })}
                        >
                            <FontAwesomeIcon icon={this.state.showAllTime ? faToggleOn : faToggleOff} />&nbsp;
                        Show whole time
                    </button>
                    </div>
                    <div>
                        {this.props.midiLiveData.length} notes
                    </div>
                </div>
            </div>
        );
    }
}
