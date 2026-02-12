import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  AlojamientoService,
  AsignacionActualResumen,
  CreateAsignacionHabitacionDto,
  Habitacion,
  Huesped,
  PisoZona,
  CreateHuespedDto,
  UpdateHuespedDto,
  EmpresaHostal,
  CreateEmpresaHostalDto,
} from '../../../../core/services/alojamiento.service';

@Component({
  selector: 'app-alojamiento-home-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './alojamiento-home.page.html',
})
export class AlojamientoHomePage implements OnInit {
  private alojamientoService = inject(AlojamientoService);
  private readonly guestSuggestionLimit = 8;
  private readonly guestSearchMinChars = 2;
  private readonly dateTimeFormatter = new Intl.DateTimeFormat('es-CL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  @ViewChild('svgRef', { static: false }) svgRef?: ElementRef<SVGSVGElement>;

  availableRooms: Habitacion[] = [];
  availableRoomIds = new Set<string>();

  pisos: PisoZona[] = [];
  selectedPiso: PisoZona | null = null;
  habitacionesPiso: Habitacion[] = [];

  selectedRoom: Habitacion | null = null;
  selectedRoomAssignment: AsignacionActualResumen | null = null;
  selectedGuest: Huesped | null = null;

  empresas: EmpresaHostal[] = [];

  viewBoxX = 0;
  viewBoxY = 0;
  viewBoxW = 1400;
  viewBoxH = 900;
  isPanning = false;
  panStart: { x: number; y: number; vx: number; vy: number } | null = null;

  asignacionForm: CreateAsignacionHabitacionDto = {
    habitacionId: '',
    huespedId: '',
    cantidadNoches: 1,
  };

  loading = false;
  loadingPisos = false;
  loadingRooms = false;
  loadingEmpresas = false;
  savingAsignacion = false;
  errorMsg = '';
  successMsg = '';

  guestSearchTerm = '';
  guestSuggestions: Huesped[] = [];
  showGuestSug = false;
  activeGuestIndex = -1;
  guestSearchLoading = false;
  guestSearchTimer: ReturnType<typeof setTimeout> | null = null;
  guestRemoteSearchInFlight = '';
  guestLastRemoteTerm = '';

  isGuestModalOpen = false;
  modalSearchTerm = '';
  modalSearchResults: Huesped[] = [];
  modalSearchLoading = false;
  modalSearchTimer: ReturnType<typeof setTimeout> | null = null;
  showModalSug = false;
  activeModalSearchIndex = -1;
  modalRemoteSearchInFlight = '';
  modalLastRemoteTerm = '';
  modalSelectedGuest: Huesped | null = null;
  modalRutLocked = false;
  modalGuestSelectionLocked = false;
  modalErrorMsg = '';
  modalSuccessMsg = '';

  guestForm: CreateHuespedDto = {
    nombreCompleto: '',
    correo: '',
    rut: '',
    observacion: '',
    telefono: '',
    empresaHostalId: undefined,
  };

  companyForm: CreateEmpresaHostalDto = {
    nombreEmpresa: '',
    nombreContratista: '',
    correoContratista: '',
    fonoContratista: '',
  };

  showCompanyForm = false;

  private guestCache = new Map<string, Huesped>();

  ngOnInit() {
    this.loadPisos();
    this.loadEmpresas();
    this.refreshDisponibles();
  }

  refreshDisponibles() {
    this.loading = true;
    this.alojamientoService.listDisponibles().subscribe({
      next: (data) => {
        this.availableRooms = data ?? [];
        this.availableRoomIds = new Set(this.availableRooms.map((r) => r.id));
      },
      error: (err) => {
        const msg = err?.error?.message;
        this.errorMsg = Array.isArray(msg) ? msg.join(' | ') : (msg ?? 'No se pudo consultar disponibilidad.');
      },
      complete: () => (this.loading = false),
    });
  }

  loadPisos() {
    this.loadingPisos = true;
    this.alojamientoService.listPisos().subscribe({
      next: (data) => {
        this.pisos = data ?? [];
        if (this.pisos.length > 0) {
          this.selectPiso(this.pisos[0]);
        }
      },
      error: () => this.setError('No se pudieron cargar los pisos.'),
      complete: () => (this.loadingPisos = false),
    });
  }

  onPisoSelect(id: string | null) {
    if (!id) return;
    const piso = this.pisos.find((p) => p.id === id) || null;
    if (piso) this.selectPiso(piso);
  }

  selectPiso(piso: PisoZona) {
    this.selectedPiso = piso;
    this.selectedRoom = null;
    this.selectedRoomAssignment = null;
    this.resetViewBox(piso);
    this.loadHabitaciones(piso.id);
  }

  resetViewBox(piso: PisoZona) {
    this.viewBoxX = 0;
    this.viewBoxY = 0;
    this.viewBoxW = piso.anchoLienzo;
    this.viewBoxH = piso.altoLienzo;
  }

  get viewBox() {
    return `${this.viewBoxX} ${this.viewBoxY} ${this.viewBoxW} ${this.viewBoxH}`;
  }

  loadHabitaciones(pisoId: string) {
    this.loadingRooms = true;
    this.alojamientoService.listHabitaciones(pisoId).subscribe({
      next: (data) => {
        this.habitacionesPiso = data ?? [];
      },
      error: () => this.setError('No se pudieron cargar las habitaciones del piso.'),
      complete: () => (this.loadingRooms = false),
    });
  }

  loadEmpresas() {
    this.loadingEmpresas = true;
    this.alojamientoService.listEmpresas().subscribe({
      next: (data) => (this.empresas = data ?? []),
      error: () => this.setError('No se pudieron cargar las empresas.'),
      complete: () => (this.loadingEmpresas = false),
    });
  }

  onWheel(event: WheelEvent) {
    event.preventDefault();
    const factor = event.deltaY > 0 ? 1.1 : 0.9;
    const nextW = Math.min(Math.max(this.viewBoxW * factor, 200), 5000);
    const nextH = Math.min(Math.max(this.viewBoxH * factor, 200), 5000);
    const svg = this.svgRef?.nativeElement;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const mx = ((event.clientX - rect.left) / rect.width) * this.viewBoxW + this.viewBoxX;
    const my = ((event.clientY - rect.top) / rect.height) * this.viewBoxH + this.viewBoxY;
    const dx = (mx - this.viewBoxX) / this.viewBoxW;
    const dy = (my - this.viewBoxY) / this.viewBoxH;
    this.viewBoxW = nextW;
    this.viewBoxH = nextH;
    this.viewBoxX = mx - dx * nextW;
    this.viewBoxY = my - dy * nextH;
  }

  onSvgMouseDown(event: MouseEvent) {
    if (!this.selectedPiso) return;
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target?.getAttribute('data-room-id')) return;
    event.preventDefault();
    this.isPanning = true;
    this.panStart = { x: event.clientX, y: event.clientY, vx: this.viewBoxX, vy: this.viewBoxY };
  }

  onSvgMouseMove(event: MouseEvent) {
    if (!this.isPanning || !this.panStart) return;
    const svg = this.svgRef?.nativeElement;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const dx = event.clientX - this.panStart.x;
    const dy = event.clientY - this.panStart.y;
    const scaleX = this.viewBoxW / rect.width;
    const scaleY = this.viewBoxH / rect.height;
    this.viewBoxX = this.panStart.vx - dx * scaleX;
    this.viewBoxY = this.panStart.vy - dy * scaleY;
  }

  onSvgMouseUp() {
    if (this.isPanning) {
      this.isPanning = false;
      this.panStart = null;
    }
  }

  selectRoom(room: Habitacion) {
    this.selectedRoom = room;
    this.selectedRoomAssignment = null;
    if (this.availableRoomIds.has(room.id)) {
      this.asignacionForm.habitacionId = room.id;
      return;
    }
    this.asignacionForm.habitacionId = '';
    this.loadCurrentAssignment(room.id);
  }

  private loadCurrentAssignment(roomId: string) {
    this.alojamientoService.getCurrentAssignment(roomId).subscribe({
      next: (assignment) => {
        this.selectedRoomAssignment = assignment;
      },
      error: () => {
        this.selectedRoomAssignment = null;
      },
    });
  }

  openEditCurrentAssignmentGuest() {
    const guest = this.selectedRoomAssignment?.huesped;
    if (!guest) return;
    this.openGuestModal(true);
    this.selectModalGuest(guest);
  }

  onGuestSearchChange(term: string) {
    this.guestSearchTerm = term;
    if (this.guestSearchTimer) clearTimeout(this.guestSearchTimer);
    const normalized = this.normalizeSearchTerm(term);
    if (normalized.length < this.guestSearchMinChars) {
      this.guestSuggestions = [];
      this.showGuestSug = false;
      this.activeGuestIndex = -1;
      this.guestSearchLoading = false;
      return;
    }

    this.guestSuggestions = this.getGuestsFromCache(normalized);
    this.showGuestSug = true;
    this.activeGuestIndex = this.guestSuggestions.length ? 0 : -1;

    if (normalized === this.guestLastRemoteTerm) return;

    this.guestSearchTimer = setTimeout(() => {
      this.searchGuestsRemote(normalized, 'assign');
    }, 250);
  }

  openGuestSuggestions() {
    const normalized = this.normalizeSearchTerm(this.guestSearchTerm);
    if (normalized.length < this.guestSearchMinChars) return;
    this.guestSuggestions = this.getGuestsFromCache(normalized);
    this.showGuestSug = true;
    this.activeGuestIndex = this.guestSuggestions.length ? 0 : -1;
  }

  onGuestKeydown(event: KeyboardEvent) {
    if (!this.showGuestSug || this.guestSuggestions.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.activeGuestIndex = this.clampGuestIndex(this.activeGuestIndex + 1);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.activeGuestIndex = this.clampGuestIndex(this.activeGuestIndex - 1);
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const idx = this.activeGuestIndex >= 0 ? this.activeGuestIndex : 0;
      const g = this.guestSuggestions[idx];
      if (g) this.selectGuestFromSearch(g);
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeGuestSug();
    }
  }

  private clampGuestIndex(idx: number) {
    const max = this.guestSuggestions.length - 1;
    if (idx < 0) return 0;
    if (idx > max) return max;
    return idx;
  }

  closeGuestSearchDelayed() {
    setTimeout(() => {
      this.showGuestSug = false;
    }, 150);
  }

  private searchGuestsRemote(term: string, target: 'assign' | 'modal') {
    if (!term || term.length < this.guestSearchMinChars) return;

    if (target === 'assign') {
      if (this.guestRemoteSearchInFlight === term) return;
      this.guestRemoteSearchInFlight = term;
      this.guestSearchLoading = true;
    } else {
      if (this.modalRemoteSearchInFlight === term) return;
      this.modalRemoteSearchInFlight = term;
      this.modalSearchLoading = true;
    }

    this.alojamientoService.searchHuespedes(term).subscribe({
      next: (data) => {
        const guests = data ?? [];
        this.storeGuestCache(guests);

        if (target === 'modal') {
          this.modalLastRemoteTerm = term;
          if (this.normalizeSearchTerm(this.modalSearchTerm) !== term) return;
          this.modalSearchResults = this.getGuestsFromCache(term);
          this.showModalSug = true;
          this.activeModalSearchIndex = this.modalSearchResults.length ? 0 : -1;
        } else {
          this.guestLastRemoteTerm = term;
          if (this.normalizeSearchTerm(this.guestSearchTerm) !== term) return;
          this.guestSuggestions = this.getGuestsFromCache(term);
          this.showGuestSug = true;
          this.activeGuestIndex = this.guestSuggestions.length ? 0 : -1;
        }
      },
      error: () => {
        if (target === 'modal') {
          this.modalErrorMsg = 'No se pudo buscar huéspedes.';
        } else {
          this.setError('No se pudo buscar huéspedes.');
        }
      },
      complete: () => {
        if (target === 'modal') {
          if (this.modalRemoteSearchInFlight === term) {
            this.modalRemoteSearchInFlight = '';
          }
          this.modalSearchLoading = false;
        } else {
          if (this.guestRemoteSearchInFlight === term) {
            this.guestRemoteSearchInFlight = '';
          }
          this.guestSearchLoading = false;
        }
      },
    });
  }

  selectGuestFromSearch(guest: Huesped) {
    this.storeGuestCache([guest]);
    this.selectedGuest = guest;
    this.asignacionForm.huespedId = guest.id;
    this.guestSearchTerm = guest.nombreCompleto;
    this.guestSuggestions = [];
    this.showGuestSug = false;
    this.activeGuestIndex = -1;
  }

  clearGuestSelection() {
    this.selectedGuest = null;
    this.asignacionForm.huespedId = '';
    this.guestSearchTerm = '';
    this.guestSuggestions = [];
    this.showGuestSug = false;
    this.activeGuestIndex = -1;
  }

  private closeGuestSug() {
    this.showGuestSug = false;
  }

  openGuestModal(lockGuestSelection = false) {
    this.isGuestModalOpen = true;
    this.modalGuestSelectionLocked = lockGuestSelection;
    this.modalSearchTerm = '';
    this.modalSearchResults = [];
    this.showModalSug = false;
    this.activeModalSearchIndex = -1;
    this.modalSelectedGuest = null;
    this.modalRutLocked = false;
    this.modalErrorMsg = '';
    this.modalSuccessMsg = '';
    this.guestForm = {
      nombreCompleto: '',
      correo: '',
      rut: '',
      observacion: '',
      telefono: '',
      empresaHostalId: undefined,
    };
    this.showCompanyForm = false;
  }

  closeGuestModal() {
    this.isGuestModalOpen = false;
    this.modalGuestSelectionLocked = false;
  }

  onModalSearchChange(term: string) {
    this.modalSearchTerm = term;
    if (this.modalSearchTimer) clearTimeout(this.modalSearchTimer);
    const normalized = this.normalizeSearchTerm(term);
    if (normalized.length < this.guestSearchMinChars) {
      this.modalSearchResults = [];
      this.showModalSug = false;
      this.activeModalSearchIndex = -1;
      this.modalSearchLoading = false;
      return;
    }

    this.modalSearchResults = this.getGuestsFromCache(normalized);
    this.showModalSug = true;
    this.activeModalSearchIndex = this.modalSearchResults.length ? 0 : -1;

    if (normalized === this.modalLastRemoteTerm) return;

    this.modalSearchTimer = setTimeout(() => {
      this.searchGuestsRemote(normalized, 'modal');
    }, 250);
  }

  openModalSuggestions() {
    const normalized = this.normalizeSearchTerm(this.modalSearchTerm);
    if (normalized.length < this.guestSearchMinChars) return;
    this.modalSearchResults = this.getGuestsFromCache(normalized);
    this.showModalSug = true;
    this.activeModalSearchIndex = this.modalSearchResults.length ? 0 : -1;
  }

  closeModalSearchDelayed() {
    setTimeout(() => {
      this.showModalSug = false;
    }, 150);
  }

  onModalSearchKeydown(event: KeyboardEvent) {
    if (!this.showModalSug || this.modalSearchResults.length === 0) {
      if (event.key === 'Escape') {
        event.preventDefault();
        this.showModalSug = false;
      }
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.activeModalSearchIndex = this.clampModalSearchIndex(this.activeModalSearchIndex + 1);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.activeModalSearchIndex = this.clampModalSearchIndex(this.activeModalSearchIndex - 1);
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const idx = this.activeModalSearchIndex >= 0 ? this.activeModalSearchIndex : 0;
      const g = this.modalSearchResults[idx];
      if (g) this.selectModalGuest(g);
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      this.showModalSug = false;
    }
  }

  private clampModalSearchIndex(idx: number) {
    const max = this.modalSearchResults.length - 1;
    if (idx < 0) return 0;
    if (idx > max) return max;
    return idx;
  }

  selectModalGuest(guest: Huesped) {
    this.storeGuestCache([guest]);
    this.modalSelectedGuest = guest;
    this.modalRutLocked = !!guest.rut;
    this.guestForm = {
      nombreCompleto: guest.nombreCompleto,
      correo: guest.correo ?? '',
      rut: guest.rut ?? '',
      observacion: guest.observacion ?? '',
      telefono: guest.telefono ?? '',
      empresaHostalId: guest.empresaHostal?.id ?? undefined,
    };
    this.modalSearchResults = [];
    this.showModalSug = false;
    this.activeModalSearchIndex = -1;
    this.modalSearchTerm = guest.nombreCompleto;
  }

  saveGuestFromModal() {
    this.modalErrorMsg = '';
    this.modalSuccessMsg = '';
    const nombre = (this.guestForm.nombreCompleto || '').trim();
    if (!nombre) {
      this.modalErrorMsg = 'El nombre del huésped es obligatorio.';
      return;
    }

    const basePayload = {
      nombreCompleto: nombre,
      correo: this.cleanOptional(this.guestForm.correo),
      observacion: this.cleanOptional(this.guestForm.observacion),
      telefono: this.cleanOptional(this.guestForm.telefono),
      empresaHostalId: this.guestForm.empresaHostalId || undefined,
    };

    if (this.modalSelectedGuest) {
      const payload: UpdateHuespedDto = { ...basePayload };
      if (!this.modalRutLocked) {
        payload.rut = this.cleanOptional(this.guestForm.rut);
      }
      this.alojamientoService.updateHuesped(this.modalSelectedGuest.id, payload).subscribe({
        next: (res) => {
          this.modalSuccessMsg = 'Huésped actualizado correctamente.';
          this.modalLastRemoteTerm = '';
          this.selectGuestFromSearch(res);
          this.closeGuestModal();
        },
        error: (err) => {
          const msg = err?.error?.message;
          this.modalErrorMsg = Array.isArray(msg) ? msg.join(' | ') : (msg ?? 'No se pudo actualizar el huésped.');
        },
      });
      return;
    }

    const payload: CreateHuespedDto = {
      ...basePayload,
      rut: this.cleanOptional(this.guestForm.rut),
    };

    this.alojamientoService.createHuesped(payload).subscribe({
      next: (res) => {
        this.modalSuccessMsg = 'Huésped registrado correctamente.';
        this.modalLastRemoteTerm = '';
        this.selectGuestFromSearch(res);
        this.closeGuestModal();
      },
      error: (err) => {
        const msg = err?.error?.message;
        this.modalErrorMsg = Array.isArray(msg) ? msg.join(' | ') : (msg ?? 'No se pudo registrar el huésped.');
      },
    });
  }

  saveEmpresaFromModal() {
    this.modalErrorMsg = '';
    const nombre = (this.companyForm.nombreEmpresa || '').trim();
    if (!nombre) {
      this.modalErrorMsg = 'El nombre de la empresa es obligatorio.';
      return;
    }

    const payload: CreateEmpresaHostalDto = {
      nombreEmpresa: nombre,
      nombreContratista: this.cleanOptional(this.companyForm.nombreContratista),
      correoContratista: this.cleanOptional(this.companyForm.correoContratista),
      fonoContratista: this.cleanOptional(this.companyForm.fonoContratista),
    };

    this.alojamientoService.createEmpresa(payload).subscribe({
      next: (res) => {
        this.companyForm = {
          nombreEmpresa: '',
          nombreContratista: '',
          correoContratista: '',
          fonoContratista: '',
        };
        this.showCompanyForm = false;
        this.loadEmpresas();
        this.guestForm.empresaHostalId = res.id;
      },
      error: (err) => {
        const msg = err?.error?.message;
        this.modalErrorMsg = Array.isArray(msg) ? msg.join(' | ') : (msg ?? 'No se pudo registrar la empresa.');
      },
    });
  }

  saveAsignacion() {
    this.clearMessages();
    if (!this.asignacionForm.habitacionId || !this.asignacionForm.huespedId) {
      this.setError('Selecciona habitación y huésped para asignar.');
      return;
    }
    if (this.getCantidadNoches() < 1) {
      this.setError('Debes indicar una cantidad de noches válida.');
      return;
    }

    this.savingAsignacion = true;
    this.alojamientoService.createAsignacion({ ...this.asignacionForm }).subscribe({
      next: () => {
        this.successMsg = 'Asignación registrada correctamente.';
        this.asignacionForm.habitacionId = '';
        this.asignacionForm.cantidadNoches = 1;
        this.refreshDisponibles();
      },
      error: (err) => {
        const msg = err?.error?.message;
        this.setError(Array.isArray(msg) ? msg.join(' | ') : (msg ?? 'No se pudo asignar la habitación.'));
      },
      complete: () => (this.savingAsignacion = false),
    });
  }

  bedTotal(room: Habitacion) {
    return (room.camas ?? []).reduce((sum, c) => sum + (c.cantidad ?? 0), 0);
  }

  getBedTypeSummary(room: Habitacion | null) {
    const list = room?.camas ?? [];
    const counter = new Map<string, number>();
    for (const bed of list) {
      const name = (bed.item ?? '').trim() || 'Sin tipo';
      counter.set(name, (counter.get(name) ?? 0) + (bed.cantidad ?? 0));
    }
    return Array.from(counter.entries()).map(([name, count]) => ({ name, count }));
  }

  get selectedRoomIsAvailable() {
    return !!this.selectedRoom && this.getRoomStatus(this.selectedRoom) === 'DISPONIBLE';
  }

  get canAssign() {
    return this.selectedRoomIsAvailable && !!this.asignacionForm.huespedId && this.getCantidadNoches() >= 1;
  }

  get hasCurrentAssignmentDetails() {
    return !!this.selectedRoom && this.getRoomStatus(this.selectedRoom) === 'OCUPADA' && !!this.selectedRoomAssignment;
  }

  getRoomStatus(room: Habitacion) {
    if (!room.estadoActivo) return 'INACTIVA';
    return this.availableRoomIds.has(room.id) ? 'DISPONIBLE' : 'OCUPADA';
  }

  getRoomFill(room: Habitacion) {
    if (!room.estadoActivo) return '#e2e8f0';
    return this.availableRoomIds.has(room.id) ? '#bbf7d0' : '#fed7aa';
  }

  getRoomStroke(room: Habitacion) {
    if (this.selectedRoom?.id === room.id) return '#1d4ed8';
    return '#0f172a';
  }

  private setError(message: string) {
    this.errorMsg = message;
  }

  private clearMessages() {
    this.errorMsg = '';
    this.successMsg = '';
  }

  private cleanOptional(value?: string) {
    const cleaned = (value ?? '').trim();
    return cleaned ? cleaned : undefined;
  }

  private normalizeSearchTerm(value: string) {
    return (value || '').trim().toLowerCase();
  }

  get fechaIngresoPreview() {
    return this.formatPreviewDate(new Date());
  }

  get fechaSalidaPreview() {
    const noches = this.getCantidadNoches();
    if (noches < 1) return '-';

    const salida = this.calculateFechaSalida(new Date(), noches);
    return this.formatPreviewDate(salida);
  }

  get montoPreview() {
    const noches = this.getCantidadNoches();
    const room = this.getHabitacionSeleccionada();
    if (noches < 1 || !room) return null;

    const precio = Number(room.precio);
    if (!Number.isFinite(precio)) return null;
    return precio * noches;
  }

  private getCantidadNoches() {
    const noches = Number(this.asignacionForm.cantidadNoches);
    if (!Number.isInteger(noches)) return 0;
    return noches;
  }

  private getHabitacionSeleccionada() {
    if (!this.asignacionForm.habitacionId) return null;
    return this.availableRooms.find((room) => room.id === this.asignacionForm.habitacionId) ?? null;
  }

  private calculateFechaSalida(fechaIngreso: Date, cantidadNoches: number) {
    const salida = new Date(fechaIngreso);
    salida.setDate(salida.getDate() + cantidadNoches);
    salida.setHours(12, 0, 0, 0);
    return salida;
  }

  private formatPreviewDate(date: Date) {
    return this.dateTimeFormatter.format(date);
  }

  formatApiDate(value?: string) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return this.formatPreviewDate(date);
  }

  private storeGuestCache(guests: Huesped[]) {
    for (const guest of guests) {
      this.guestCache.set(guest.id, guest);
    }
  }

  private getGuestsFromCache(normalizedTerm: string) {
    if (!normalizedTerm) return [];
    return Array.from(this.guestCache.values())
      .filter((guest) => this.matchGuestTerm(guest, normalizedTerm))
      .slice(0, this.guestSuggestionLimit);
  }

  private matchGuestTerm(guest: Huesped, normalizedTerm: string) {
    const nombre = this.normalizeSearchTerm(guest.nombreCompleto);
    const rut = this.normalizeSearchTerm(guest.rut ?? '');
    const correo = this.normalizeSearchTerm(guest.correo ?? '');
    const telefono = this.normalizeSearchTerm(guest.telefono ?? '');
    const empresa = this.normalizeSearchTerm(guest.empresaHostal?.nombreEmpresa ?? '');
    return (
      nombre.includes(normalizedTerm) ||
      rut.includes(normalizedTerm) ||
      correo.includes(normalizedTerm) ||
      telefono.includes(normalizedTerm) ||
      empresa.includes(normalizedTerm)
    );
  }
}
