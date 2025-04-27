import { StrictMode, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './index.css';

const MigrationCalculator = () => {
  // State für alle Eingabeparameter
  const [documentCount, setDocumentCount] = useState(1000000);
  const [timePerDocument, setTimePerDocument] = useState(5);
  const [releaseDate, setReleaseDate] = useState(new Date('2026-03-01'));
  const [startDate, setStartDate] = useState(new Date('2025-08-01'));
  const [interruptions, setInterruptions] = useState(2);
  const [renameOverhead, setRenameOverhead] = useState(10);
  const [parallelFactor, setParallelFactor] = useState(1);
  const [parallelImplTime, setParallelImplTime] = useState(5);
  
  // Berechnete Werte
  const [endDate, setEndDate] = useState<Date | null>(null); // Added type annotation
  const [chartData, setChartData] = useState<any[]>([]); // Added type annotation
  const [isOnTime, setIsOnTime] = useState(true);
  
  // Berechnung beim Ändern eines Parameters
  useEffect(() => {
    calculateMigration();
  }, [documentCount, timePerDocument, releaseDate, startDate, interruptions, renameOverhead, parallelFactor, parallelImplTime]);
  
  // Hilfsfunktion zum Formatieren von Daten
  const formatDate = (date: Date): string => { // Added type annotation
    return date.toLocaleDateString('de-DE', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };
  
  // Hauptberechnungsfunktion
  const calculateMigration = () => {
    // Berechnung der Anzahl an Dokumenten pro Tag
    // Annahme: 8 Stunden Arbeitszeit pro Tag, 5 Tage pro Woche
    const secondsPerDay = 8 * 60 * 60; // 8 Stunden in Sekunden
    
    // Berücksichtige Parallelisierungsfaktor, falls > 1
    const effectiveTimePerDoc = parallelFactor > 1 ? timePerDocument / parallelFactor : timePerDocument;
    const docsPerDay = Math.floor(secondsPerDay / effectiveTimePerDoc);
    
    // Berechnung der benötigten Tage für die Migration (ohne Unterbrechungen)
    const requiredDays = Math.ceil(documentCount / docsPerDay);
    
    // Berechnung der Arbeitstage unter Berücksichtigung von Wochenenden
    let currentDate = new Date(startDate);
    let daysProcessed = 0;
    let documentsProcessed = 0;
    let interruptionsLeft = interruptions;
    let interruptionEndDates: Date[] = []; // Added type annotation
    
    // Overhead für Umbenennungen in Tagen am Anfang hinzufügen
    if (renameOverhead > 0) {
      currentDate = addBusinessDays(currentDate, renameOverhead);
    }
    
    // Falls Parallelisierung aktiviert ist, füge Implementationszeit hinzu
    if (parallelFactor > 1 && parallelImplTime > 0) {
      currentDate = addBusinessDays(currentDate, parallelImplTime);
    }
    
    // Generiere zufällige Wochen für Unterbrechungen
    const totalWeeks = Math.ceil(requiredDays / 5);
    const interruptionWeeks: number[] = []; // Added type annotation
    
    for (let i = 0; i < interruptions; i++) {
      const randomWeek = Math.floor(Math.random() * totalWeeks);
      if (!interruptionWeeks.includes(randomWeek)) {
        interruptionWeeks.push(randomWeek);
      } else {
        // Falls die Woche bereits verwendet wurde, versuche es erneut
        i--;
      }
    }
    
    // Sortiere die Wochen aufsteigend
    interruptionWeeks.sort((a, b) => a - b);
    
    // Generiere Daten für den Chart
    const data: any[] = []; // Added type annotation
    
    // Startpunkt für den Chart
    data.push({
      date: formatDate(new Date(startDate)),
      remainingDocs: documentCount,
      event: 'Start der Migration'
    });
    
    // Wenn Overhead für Umbenennungen existiert, füge einen Datenpunkt hinzu
    if (renameOverhead > 0) {
      const overheadDate = addBusinessDays(new Date(startDate), renameOverhead);
      data.push({
        date: formatDate(overheadDate),
        remainingDocs: documentCount,
        event: 'Ende der Umbenennungsphase'
      });
    }
    
    // Wenn Parallelisierung implementiert wird, füge einen Datenpunkt hinzu
    if (parallelFactor > 1 && parallelImplTime > 0) {
      const parallelDate = addBusinessDays(
        renameOverhead > 0 ? 
          addBusinessDays(new Date(startDate), renameOverhead) : 
          new Date(startDate), 
        parallelImplTime
      );
      data.push({
        date: formatDate(parallelDate),
        remainingDocs: documentCount,
        event: 'Parallelisierung aktiviert'
      });
    }
    
    while (documentsProcessed < documentCount) {
      // Prüfe, ob es sich um einen Arbeitstag handelt (Mo-Fr)
      if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
        daysProcessed++;
        
        // Prüfe auf Unterbrechungen
        if (interruptionWeeks.includes(Math.floor(daysProcessed / 5))) {
          if (interruptionsLeft > 0) {
            // Eine Woche (5 Arbeitstage) Unterbrechung
            currentDate = addBusinessDays(currentDate, 5);
            interruptionsLeft--;
            
            // Speichere das Enddatum der Unterbrechung
            const interruptionEnd = new Date(currentDate);
            interruptionEndDates.push(interruptionEnd);
            
            // Füge Unterbrechungspunkt zum Chart hinzu
            data.push({
              date: formatDate(interruptionEnd),
              remainingDocs: documentCount - documentsProcessed,
              event: 'Ende einer Unterbrechung'
            });
            
            continue;
          }
        }
        
        // Berechne, wie viele Dokumente an diesem Tag verarbeitet werden
        const docsToday = Math.min(docsPerDay, documentCount - documentsProcessed);
        documentsProcessed += docsToday;
      }
      
      // Nächster Tag
      currentDate.setDate(currentDate.getDate() + 1);
      
      // Füge jeden Montag oder am letzten Tag einen Datenpunkt hinzu
      if (currentDate.getDay() === 1 || documentsProcessed >= documentCount) {
        data.push({
          date: formatDate(new Date(currentDate)),
          remainingDocs: documentCount - documentsProcessed,
          event: documentsProcessed >= documentCount ? 'Ende der Migration' : ''
        });
      }
    }
    
    // Setze Enddatum
    setEndDate(currentDate);
    setChartData(data);
    
    // Prüfe, ob die Migration vor dem Release-Datum abgeschlossen ist
    setIsOnTime(currentDate <= releaseDate);
  };
  
  // Hilfsfunktion zum Hinzufügen von Arbeitstagen
  const addBusinessDays = (date: Date, days: number): Date => { // Added type annotations
    const result = new Date(date);
    let addedDays = 0;
    
    while (addedDays < days) {
      result.setDate(result.getDate() + 1);
      if (result.getDay() !== 0 && result.getDay() !== 6) {
        addedDays++;
      }
    }
    
    return result;
  };
  
  // Format für numerische Werte mit Tausendertrennzeichen
  const formatNumber = (num: number): string => { // Added type annotation
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  return (
    <div className="p-6 bg-gray-50 rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold mb-2 text-center">Dokumentmigrations-Rechner</h1>
      <p className="text-center text-gray-600 mb-6">Berechnet Zeitpläne für die Migration von Dokumenten mit verschiedenen Parametern</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10h14M5 14h14" />
            </svg>
            Eingabeparameter
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Anzahl Dokumente: {formatNumber(documentCount)}
                <span className="ml-1 text-xs text-gray-500">(Gesamtzahl zu migrierender Dokumente)</span>
              </label>
              <input 
                type="range" 
                min="0" 
                max="5000000" 
                step="10000" 
                value={documentCount} 
                onChange={(e) => setDocumentCount(parseInt(e.target.value))}
                className="w-full h-2 bg-blue-100 rounded-lg appearance-none cursor-pointer" 
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>0</span>
                <span>5.000.000</span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">
                Zeit pro Dokument: {timePerDocument} Sekunden
                <span className="ml-1 text-xs text-gray-500">(Durchschnittliche Verarbeitungszeit)</span>
              </label>
              <input 
                type="range" 
                min="0.1" 
                max="20" 
                step="0.1" 
                value={timePerDocument} 
                onChange={(e) => setTimePerDocument(parseFloat(e.target.value))}
                className="w-full h-2 bg-blue-100 rounded-lg appearance-none cursor-pointer" 
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>0.1 Sek.</span>
                <span>20 Sek.</span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">
                Zeitpunkt Produktivrelease: {formatDate(releaseDate)}
                <span className="ml-1 text-xs text-gray-500">(Deadline für das Projekt)</span>
              </label>
              <input 
                type="date" 
                value={releaseDate.toISOString().split('T')[0]} 
                onChange={(e) => setReleaseDate(new Date(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded" 
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">
                Start der Konvertierung: {formatDate(startDate)}
                <span className="ml-1 text-xs text-gray-500">(Beginn der Migration)</span>
              </label>
              <input 
                type="date" 
                value={startDate.toISOString().split('T')[0]} 
                onChange={(e) => setStartDate(new Date(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded" 
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">
                Anzahl Unterbrechungen: {interruptions}
                <span className="ml-1 text-xs text-gray-500">(Je 1 Woche Projektpause)</span>
              </label>
              <input 
                type="range" 
                min="0" 
                max="5" 
                step="1" 
                value={interruptions} 
                onChange={(e) => setInterruptions(parseInt(e.target.value))}
                className="w-full h-2 bg-blue-100 rounded-lg appearance-none cursor-pointer" 
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>0</span>
                <span>5</span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">
                Overhead Umbenennung: {renameOverhead} Tage
                <span className="ml-1 text-xs text-gray-500">(Zusätzliche Zeit für die Umbenennung von Dokumenten)</span>
              </label>
              <input 
                type="range" 
                min="0" 
                max="30" 
                step="1" 
                value={renameOverhead} 
                onChange={(e) => setRenameOverhead(parseInt(e.target.value))}
                className="w-full h-2 bg-blue-100 rounded-lg appearance-none cursor-pointer" 
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>0 Tage</span>
                <span>30 Tage</span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">
                Parallelisierungsgrad: {parallelFactor}x
                <span className="ml-1 text-xs text-gray-500">(Teilt die Bearbeitungszeit pro Dokument)</span>
              </label>
              <input 
                type="range" 
                min="1" 
                max="10" 
                step="1" 
                value={parallelFactor} 
                onChange={(e) => setParallelFactor(parseInt(e.target.value))}
                className="w-full h-2 bg-blue-100 rounded-lg appearance-none cursor-pointer" 
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>1x (keine Parallelisierung)</span>
                <span>10x</span>
              </div>
            </div>
            
            {parallelFactor > 1 && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Implementationsaufwand: {parallelImplTime} Tage
                  <span className="ml-1 text-xs text-gray-500">(Zeit für die Einrichtung der Parallelisierung)</span>
                </label>
                <input 
                  type="range" 
                  min="0" 
                  max="30" 
                  step="1" 
                  value={parallelImplTime} 
                  onChange={(e) => setParallelImplTime(parseInt(e.target.value))}
                  className="w-full h-2 bg-blue-100 rounded-lg appearance-none cursor-pointer" 
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>0 Tage</span>
                  <span>30 Tage</span>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Ergebnisse
          </h2>
          
          <div className="space-y-6">
            <div className={isOnTime ? "border-l-4 border-green-500 bg-green-50 p-3 rounded" : "border-l-4 border-red-500 bg-red-50 p-3 rounded"}>
              <h3 className="font-medium">Migrationsstatus</h3>
              <p className={isOnTime ? "text-green-700" : "text-red-700"}>
                {isOnTime ? 
                  `Migration wird rechtzeitig bis zum Release am ${endDate ? formatDate(releaseDate) : '??'} abgeschlossen sein.` : // Added check for endDate
                  `Migration wird NICHT rechtzeitig bis zum Release am ${endDate ? formatDate(releaseDate) : '??'} abgeschlossen sein!` // Added check for endDate
                }
              </p>
            </div>
            
            {endDate && (
              <div>
                <h3 className="font-medium">Berechnetes Ende der Migration</h3>
                <p className="text-lg font-bold">{formatDate(endDate)}</p>
              </div>
            )}
            
            <div>
              <h3 className="font-medium">Zusammenfassung</h3>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>{formatNumber(documentCount)} Dokumente</li>
                <li>{timePerDocument} Sekunden pro Dokument</li>
                <li>{interruptions} Unterbrechungen à 1 Woche</li>
                <li>{renameOverhead} Tage Overhead für Umbenennungen</li>
                {parallelFactor > 1 && (
                  <>
                    <li>Parallelisierungsfaktor: {parallelFactor}x</li>
                    <li>{parallelImplTime} Tage Implementationsaufwand für Parallelisierung</li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Verlauf der verbleibenden Dokumente</h2>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart
            data={chartData}
            margin={{
              top: 5,
              right: 30,
              left: 30,
              bottom: 100,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date"
              angle={-45}
              textAnchor="end"
              height={80}
              tick={{fontSize: 12}}
            />
            <YAxis tick={{fontSize: 12}} />
            <Tooltip 
              formatter={(value: number) => [formatNumber(value), "Verbleibende Dokumente"]} // Added type annotation
              labelFormatter={(label: string) => `Datum: ${label}`} // Added type annotation
            />
            <Legend />
            <Line 
              type="stepAfter" 
              dataKey="remainingDocs" 
              name="Verbleibende Dokumente" 
              stroke="#3b82f6" 
              strokeWidth={2} 
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
        <div className="flex items-center mt-4 justify-center">
          <div className="flex items-center mr-4">
            <div className="w-4 h-4 bg-blue-500 rounded-full mr-2"></div>
            <span className="text-sm">Verbleibende Dokumente</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 border-2 border-red-500 rounded-full mr-2"></div>
            <span className="text-sm">Wichtige Ereignisse (Start, Unterbrechungen, Ende)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MigrationCalculator /> {/* Render MigrationCalculator directly */}
  </StrictMode>,
)
