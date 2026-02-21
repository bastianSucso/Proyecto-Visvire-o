import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnInit, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import {
  AlojamientoService,
  AsignacionActualResumen,
  CreateAsignacionHabitacionDto,
  CreateReservaHabitacionDto,
  Habitacion,
  Huesped,
  PisoZona,
  CreateHuespedDto,
  UpdateHuespedDto,
  EmpresaHostal,
  CreateEmpresaHostalDto,
  ReservaHabitacion,
} from '../../../../core/services/alojamiento.service';
import { CajaService } from '../../../../core/services/caja.service';

@Component({
  selector: 'app-alojamiento-home-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './alojamiento-home.page.html',
})
export class AlojamientoHomePage implements OnInit {
  private alojamientoService = inject(AlojamientoService);
  private cajaService = inject(CajaService);
  private router = inject(Router);
  private readonly guestSuggestionLimit = 8;
  private readonly guestSearchMinChars = 2;
  private readonly businessTimeZone = 'America/Santiago';
  private readonly nightStartHour = 20;
  private readonly nightEndHour = 5;
  private readonly checkoutHour = 12;
  private readonly dateTimeFormatter = new Intl.DateTimeFormat('es-CL', {
    timeZone: this.businessTimeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  private readonly businessDateTimeFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: this.businessTimeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  private readonly businessOffsetFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: this.businessTimeZone,
    timeZoneName: 'shortOffset',
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

  reservasRoom: ReservaHabitacion[] = [];
  loadingReservas = false;
  isReservaModalOpen = false;
  reservaForm: CreateReservaHabitacionDto = {
    habitacionId: '',
    huespedId: '',
    fechaIngreso: '',
    fechaSalidaEstimada: '',
  };
  selectedCalendarDate = '';
  selectedReserva: ReservaHabitacion | null = null;
  cancelReservaMotivo = '';

  empresas: EmpresaHostal[] = [];

  viewBoxX = 0;
  viewBoxY = 0;
  viewBoxW = 1400;
  viewBoxH = 900;
  calendarMonth = this.startOfMonth(new Date());
  isPanning = false;
  panStart: { x: number; y: number; vx: number; vy: number } | null = null;

  asignacionForm: CreateAsignacionHabitacionDto = {
    habitacionId: '',
    huespedId: '',
    cantidadNoches: 1,
    medioPago: 'EFECTIVO',
  };

  cajaAbierta = false;
  checkingCaja = false;

  loading = false;
  loadingPisos = false;
  loadingRooms = false;
  loadingEmpresas = false;
  savingAsignacion = false;
  finishingCleaning = false;
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
    rutEmpresa: '',
    nombreEmpresa: '',
    nombreContratista: '',
    correoContratista: '',
    fonoContratista: '',
  };

  showCompanyForm = false;

  private guestCache = new Map<string, Huesped>();

  ngOnInit() {
    this.loadCajaActual();
    this.loadPisos();
    this.loadEmpresas();
    this.refreshDisponibles();
  }

  loadCajaActual() {
    this.checkingCaja = true;
    this.cajaService.cajaActual().subscribe({
      next: (data) => {
        this.cajaAbierta = data?.sesionCaja?.estado === 'ABIERTA';
      },
      error: () => {
        this.cajaAbierta = false;
      },
      complete: () => {
        this.checkingCaja = false;
      },
    });
  }

  refreshDisponibles() {
    this.loading = true;
    this.alojamientoService.listDisponibles().subscribe({
      next: (data) => {
        this.availableRooms = data ?? [];
        this.availableRoomIds = new Set(this.availableRooms.map((r) => r.id));
        if (this.selectedRoom && this.availableRoomIds.has(this.selectedRoom.id)) {
          this.asignacionForm.habitacionId = this.selectedRoom.id;
        }
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
    this.reservasRoom = [];
    this.selectedReserva = null;
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
        const rooms = data ?? [];
        this.habitacionesPiso = rooms;

        if (!this.selectedRoom) {
          return;
        }

        const refreshedSelected = rooms.find((room) => room.id === this.selectedRoom?.id) || null;
        if (!refreshedSelected) {
          this.selectedRoom = null;
          this.selectedRoomAssignment = null;
          this.selectedReserva = null;
          this.reservasRoom = [];
          this.asignacionForm.habitacionId = '';
          this.reservaForm.habitacionId = '';
          return;
        }

        this.selectedRoom = refreshedSelected;
        this.asignacionForm.habitacionId = refreshedSelected.id;
        this.reservaForm.habitacionId = refreshedSelected.id;

        if (refreshedSelected.hasActiveAssignmentNow) {
          this.loadCurrentAssignment(refreshedSelected.id);
        } else {
          this.selectedRoomAssignment = null;
        }
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
    this.reservaForm.habitacionId = room.id;
    this.selectedReserva = null;
    this.cancelReservaMotivo = '';
    this.selectedCalendarDate = this.dateKey(new Date());
    this.reservaForm.fechaIngreso = '';
    this.reservaForm.fechaSalidaEstimada = '';
    this.calendarMonth = this.startOfMonth(new Date());
    this.loadReservasForSelectedRoom();
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
    this.reservaForm.huespedId = guest.id;
    this.guestSearchTerm = guest.nombreCompleto;
    this.guestSuggestions = [];
    this.showGuestSug = false;
    this.activeGuestIndex = -1;
  }

  clearGuestSelection() {
    this.selectedGuest = null;
    this.asignacionForm.huespedId = '';
    this.reservaForm.huespedId = '';
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
      rutEmpresa: (this.companyForm.rutEmpresa || '').trim(),
      nombreEmpresa: nombre,
      nombreContratista: this.cleanOptional(this.companyForm.nombreContratista),
      correoContratista: this.cleanOptional(this.companyForm.correoContratista),
      fonoContratista: this.cleanOptional(this.companyForm.fonoContratista),
    };

    if (!payload.rutEmpresa) {
      this.modalErrorMsg = 'El RUT empresa es obligatorio.';
      return;
    }

    this.alojamientoService.createEmpresa(payload).subscribe({
      next: (res) => {
        this.companyForm = {
          rutEmpresa: '',
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
    if (!this.cajaAbierta) {
      this.setError('Debes tener una caja abierta para registrar estadías.');
      return;
    }
    if (!this.asignacionForm.habitacionId || !this.asignacionForm.huespedId) {
      this.setError('Selecciona habitación y huésped para asignar.');
      return;
    }
    if (this.getCantidadNoches() < 1) {
      this.setError('Debes indicar una cantidad de noches válida.');
      return;
    }
    if (!this.isEmpresaConvenio && !this.asignacionForm.medioPago) {
      this.setError('Selecciona medio de pago para cobro directo.');
      return;
    }

    this.savingAsignacion = true;
    const assignedRoomId = this.asignacionForm.habitacionId;
    this.alojamientoService.createAsignacion({ ...this.asignacionForm }).subscribe({
      next: () => {
        this.successMsg = 'Asignación registrada correctamente.';
        this.asignacionForm.habitacionId = '';
        this.asignacionForm.cantidadNoches = 1;
        this.asignacionForm.medioPago = 'EFECTIVO';
        this.clearGuestSelection();
        this.selectedRoomAssignment = null;
        if (assignedRoomId) {
          this.loadCurrentAssignment(assignedRoomId);
        }
        this.refreshDisponibles();
      },
      error: (err) => {
        const msg = err?.error?.message;
        this.setError(Array.isArray(msg) ? msg.join(' | ') : (msg ?? 'No se pudo asignar la habitación.'));
      },
      complete: () => (this.savingAsignacion = false),
    });
  }

  checkoutSelectedRoom() {
    this.clearMessages();
    if (!this.cajaAbierta) {
      this.setError('Debes tener una caja abierta para registrar salida.');
      return;
    }

    const assignmentId = this.selectedRoomAssignment?.id;
    if (!assignmentId) {
      this.setError('No hay estadía activa para cerrar en esta habitación.');
      return;
    }

    const ok = window.confirm('Se registrará la salida y se liberará la habitación. ¿Confirmas?');
    if (!ok) return;

    this.alojamientoService.checkoutAsignacion(assignmentId).subscribe({
      next: () => {
        this.successMsg = 'Salida registrada. Habitación marcada en limpieza.';
        this.selectedRoomAssignment = null;
        if (this.selectedRoom) {
          this.asignacionForm.habitacionId = this.selectedRoom.id;
        }
        if (this.selectedPiso) {
          this.loadHabitaciones(this.selectedPiso.id);
        }
        this.refreshDisponibles();
      },
      error: (err) => {
        const msg = err?.error?.message;
        this.setError(Array.isArray(msg) ? msg.join(' | ') : (msg ?? 'No se pudo registrar la salida.'));
      },
    });
  }

  finishSelectedRoomCleaning() {
    this.clearMessages();
    if (!this.selectedRoom) return;
    this.finishingCleaning = true;
    this.alojamientoService.finishRoomCleaning(this.selectedRoom.id).subscribe({
      next: (updatedRoom) => {
        this.successMsg = `Limpieza finalizada para habitación ${updatedRoom.identificador}.`;
        if (this.selectedPiso) {
          this.loadHabitaciones(this.selectedPiso.id);
        }
        this.refreshDisponibles();
      },
      error: (err) => {
        const msg = err?.error?.message;
        this.setError(Array.isArray(msg) ? msg.join(' | ') : (msg ?? 'No se pudo finalizar limpieza de la habitación.'));
      },
      complete: () => {
        this.finishingCleaning = false;
      },
    });
  }

  openReservaModal() {
    if (!this.selectedRoom) return;
    this.clearMessages();
    this.isReservaModalOpen = true;
    this.reservaForm.habitacionId = this.selectedRoom.id;
    this.selectedReserva = null;
    this.cancelReservaMotivo = '';
    this.selectedCalendarDate = this.dateKey(new Date());
    this.calendarMonth = this.startOfMonth(new Date());
    this.reservaForm.fechaIngreso = '';
    this.reservaForm.fechaSalidaEstimada = '';
    this.loadReservasForSelectedRoom();
  }

  closeReservaModal() {
    this.isReservaModalOpen = false;
  }

  loadReservasForSelectedRoom() {
    if (!this.selectedRoom) {
      this.reservasRoom = [];
      this.selectedReserva = null;
      return;
    }

    this.loadingReservas = true;
    this.alojamientoService.listReservasByRoom(this.selectedRoom.id).subscribe({
      next: (reservas) => {
        this.reservasRoom = reservas ?? [];
        this.selectedReserva = this.findActiveReservaByDate(this.selectedCalendarDate);
      },
      error: (err) => {
        const msg = err?.error?.message;
        this.setError(Array.isArray(msg) ? msg.join(' | ') : (msg ?? 'No se pudieron cargar las reservas.'));
      },
      complete: () => {
        this.loadingReservas = false;
      },
    });
  }

  prevCalendarMonth() {
    this.calendarMonth = this.addMonths(this.calendarMonth, -1);
    this.loadReservasForSelectedRoom();
  }

  nextCalendarMonth() {
    this.calendarMonth = this.addMonths(this.calendarMonth, 1);
    this.loadReservasForSelectedRoom();
  }

  onCalendarDayClick(day: Date | null) {
    if (!day) return;
    const key = this.dateKey(day);
    this.selectedCalendarDate = key;
    const activeReserva = this.findActiveReservaByDate(key);
    if (activeReserva) {
      this.selectedReserva = activeReserva;
      this.cancelReservaMotivo = '';
      return;
    }

    this.selectedReserva = null;
    this.cancelReservaMotivo = '';
  }

  onReservaRangeInputChange() {
    const from = this.reservaForm.fechaIngreso;
    const to = this.reservaForm.fechaSalidaEstimada;
    if (!from || !to) {
      return;
    }

    let start = from;
    let end = to;
    if (end < start) {
      [start, end] = [end, start];
      this.reservaForm.fechaIngreso = start;
      this.reservaForm.fechaSalidaEstimada = end;
    }

    if (start < this.todayDateKey) {
      this.setError('No se pueden crear reservas con fecha de ingreso en días pasados.');
      return;
    }

    if (this.hasActiveReservaBetween(start, end)) {
      this.setError('El rango incluye días reservados. Ajusta inicio/fin.');
      return;
    }

    this.selectedReserva = null;
    this.reservaForm.fechaIngreso = start;
    this.reservaForm.fechaSalidaEstimada = end;
  }

  saveReserva() {
    this.clearMessages();
    if (!this.cajaAbierta) {
      this.setError('Debes tener una caja abierta para registrar reservas.');
      return;
    }
    if (!this.selectedRoom) {
      this.setError('Selecciona una habitación para reservar.');
      return;
    }

    const huespedId = this.selectedGuest?.id || this.asignacionForm.huespedId;
    if (!huespedId) {
      this.setError('Selecciona o registra un huésped para la reserva.');
      return;
    }

    const { start, end } = this.getReservaRangeBounds();
    if (!start || !end) {
      this.setError('Selecciona un rango de fechas para reservar.');
      return;
    }

    if (start < this.todayDateKey) {
      this.setError('No se pueden crear reservas con fecha de ingreso en días pasados.');
      return;
    }

    if (this.hasActiveReservaBetween(start, end)) {
      this.setError('El rango incluye días reservados. Selecciona otro rango.');
      return;
    }

    const payload: CreateReservaHabitacionDto = {
      habitacionId: this.selectedRoom.id,
      huespedId,
      fechaIngreso: this.dateAtHourIso(start, 15),
      fechaSalidaEstimada: this.dateAtHourIso(this.dateKey(this.addDays(this.parseDateKey(end), 1)), 12),
    };

    this.alojamientoService.createReserva(payload).subscribe({
      next: () => {
        this.successMsg = 'Reserva registrada correctamente.';
        this.selectedReserva = null;
        this.cancelReservaMotivo = '';
        this.reservaForm.fechaIngreso = '';
        this.reservaForm.fechaSalidaEstimada = '';
        this.loadReservasForSelectedRoom();
        if (this.selectedPiso) {
          this.loadHabitaciones(this.selectedPiso.id);
        }
        this.refreshDisponibles();
      },
      error: (err) => {
        const msg = err?.error?.message;
        this.setError(Array.isArray(msg) ? msg.join(' | ') : (msg ?? 'No se pudo registrar la reserva.'));
      },
    });
  }

  cancelSelectedReserva() {
    this.clearMessages();
    if (!this.cajaAbierta) {
      this.setError('Debes tener una caja abierta para cancelar reservas.');
      return;
    }
    if (!this.selectedReserva) {
      this.setError('Selecciona una reserva activa para cancelar.');
      return;
    }
    const motivo = (this.cancelReservaMotivo || '').trim();
    if (motivo.length < 3) {
      this.setError('Debes indicar un motivo de cancelación.');
      return;
    }

    this.alojamientoService.cancelReserva(this.selectedReserva.id, { motivoCancelacion: motivo }).subscribe({
      next: () => {
        this.successMsg = 'Reserva cancelada correctamente.';
        this.cancelReservaMotivo = '';
        this.selectedReserva = null;
        this.loadReservasForSelectedRoom();
        if (this.selectedPiso) {
          this.loadHabitaciones(this.selectedPiso.id);
        }
        this.refreshDisponibles();
      },
      error: (err) => {
        const msg = err?.error?.message;
        this.setError(Array.isArray(msg) ? msg.join(' | ') : (msg ?? 'No se pudo cancelar la reserva.'));
      },
    });
  }

  attendSelectedReserva() {
    this.clearMessages();
    if (!this.cajaAbierta) {
      this.setError('Debes tener una caja abierta para liberar reservas.');
      return;
    }
    if (!this.selectedReserva) {
      this.setError('Selecciona una reserva activa para liberar.');
      return;
    }

    const reserva = this.selectedReserva;
    this.alojamientoService.attendReserva(reserva.id).subscribe({
      next: () => {
        this.successMsg = 'Reserva liberada para asignación.';
        this.cancelReservaMotivo = '';
        this.selectedReserva = null;
        this.selectGuestFromSearch(reserva.huesped);
        if (this.selectedRoom) {
          this.asignacionForm.habitacionId = this.selectedRoom.id;
        }
        this.loadReservasForSelectedRoom();
        if (this.selectedPiso) {
          this.loadHabitaciones(this.selectedPiso.id);
        }
        this.refreshDisponibles();
      },
      error: (err) => {
        const msg = err?.error?.message;
        this.setError(Array.isArray(msg) ? msg.join(' | ') : (msg ?? 'No se pudo liberar la reserva.'));
      },
    });
  }

  get hasSelectedReservaActiva() {
    return this.selectedReserva?.estado === 'ACTIVA';
  }

  get reservaNoches() {
    const { start, end } = this.getReservaRangeBounds();
    if (!start || !end) return 0;
    const startDate = this.parseDateKey(start);
    const endDate = this.parseDateKey(end);
    const diff = endDate.getTime() - startDate.getTime();
    return Math.floor(diff / 86_400_000) + 1;
  }

  get reservaIngresoLabel() {
    if (!this.reservaForm.fechaIngreso) return '-';
    return this.formatApiDate(this.dateAtHourIso(this.reservaForm.fechaIngreso, 15));
  }

  get reservaSalidaLabel() {
    const { end } = this.getReservaRangeBounds();
    if (!end) return '-';
    const salida = this.dateKey(this.addDays(this.parseDateKey(end), 1));
    return this.formatApiDate(this.dateAtHourIso(salida, 12));
  }

  get canSaveReserva() {
    return (
      this.cajaAbierta &&
      !!this.selectedRoom &&
      !!this.selectedGuest &&
      this.reservaNoches >= 1 &&
      !this.hasReservaStartInPast
    );
  }

  get todayDateKey() {
    return this.dateKey(new Date());
  }

  get minReservaDate() {
    return this.todayDateKey;
  }

  get hasReservaStartInPast() {
    const { start } = this.getReservaRangeBounds();
    return !!start && start < this.todayDateKey;
  }

  get upcomingActiveReservas() {
    const today = this.todayDateKey;
    return this.reservasRoom
      .filter((reserva) => {
        if (reserva.estado !== 'ACTIVA') return false;
        const ingreso = this.dateKey(new Date(reserva.fechaIngreso));
        return ingreso >= today;
      })
      .sort((a, b) => new Date(a.fechaIngreso).getTime() - new Date(b.fechaIngreso).getTime());
  }

  get calendarMonthLabel() {
    return new Intl.DateTimeFormat('es-CL', {
      month: 'long',
      year: 'numeric',
    }).format(this.calendarMonth);
  }

  get calendarWeeks() {
    const firstDay = this.startOfMonth(this.calendarMonth);
    const month = firstDay.getMonth();
    const weekStart = (firstDay.getDay() + 6) % 7;
    const startCursor = new Date(firstDay.getFullYear(), firstDay.getMonth(), 1 - weekStart);
    const weeks: Array<Array<Date | null>> = [];
    for (let w = 0; w < 6; w++) {
      const week: Array<Date | null> = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(startCursor.getFullYear(), startCursor.getMonth(), startCursor.getDate() + w * 7 + d);
        week.push(date.getMonth() === month ? date : null);
      }
      weeks.push(week);
    }
    return weeks;
  }

  dayNumber(day: Date | null) {
    return day ? day.getDate() : '';
  }

  isSelectedDay(day: Date | null) {
    if (!day) return false;
    return this.dateKey(day) === this.selectedCalendarDate;
  }

  hasActiveReservaOnDay(day: Date | null) {
    if (!day) return false;
    const key = this.dateKey(day);
    return this.reservasRoom.some((r) => this.isReservaActiveOnDate(r, key));
  }

  selectUpcomingReserva(reserva: ReservaHabitacion) {
    const ingresoDate = new Date(reserva.fechaIngreso);
    const ingresoKey = this.dateKey(ingresoDate);
    this.selectedCalendarDate = ingresoKey;
    this.calendarMonth = this.startOfMonth(this.parseDateKey(ingresoKey));
    this.selectedReserva = reserva;
    this.cancelReservaMotivo = '';
  }

  isWithinSelectedRange(day: Date | null) {
    if (!day) return false;
    const key = this.dateKey(day);
    const { start, end } = this.getReservaRangeBounds();
    if (!start || !end) return false;
    return key >= start && key <= end;
  }

  private findActiveReservaByDate(dateKey: string) {
    return this.reservasRoom.find((r) => this.isReservaActiveOnDate(r, dateKey)) ?? null;
  }

  private isReservaActiveOnDate(reserva: ReservaHabitacion, dateKey: string) {
    if (reserva.estado !== 'ACTIVA') return false;
    const from = this.dateKey(new Date(reserva.fechaIngreso));
    const to = this.dateKey(new Date(reserva.fechaSalidaEstimada));
    return dateKey >= from && dateKey < to;
  }

  private getReservaRangeBounds() {
    const start = this.reservaForm.fechaIngreso || '';
    const end = this.reservaForm.fechaSalidaEstimada || '';
    if (!start || !end) {
      return { start: '', end: '' };
    }
    if (end < start) {
      return { start: end, end: start };
    }
    return {
      start,
      end,
    };
  }

  private hasActiveReservaBetween(start: string, end: string) {
    return this.reservasRoom.some((reserva) => {
      if (reserva.estado !== 'ACTIVA') return false;
      const reservaStart = this.dateKey(new Date(reserva.fechaIngreso));
      const reservaEndInclusive = this.dateKey(
        this.addDays(this.parseDateKey(this.dateKey(new Date(reserva.fechaSalidaEstimada))), -1),
      );
      return reservaStart <= end && reservaEndInclusive >= start;
    });
  }

  private startOfMonth(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  private addMonths(date: Date, delta: number) {
    return new Date(date.getFullYear(), date.getMonth() + delta, 1);
  }

  private addDays(date: Date, delta: number) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + delta);
  }

  private parseDateKey(dateKey: string) {
    const [year, month, day] = dateKey.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  private dateKey(date: Date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private dateAtHourIso(dateKey: string, hour: number) {
    const [year, month, day] = dateKey.split('-').map(Number);
    return new Date(year, month - 1, day, hour, 0, 0, 0).toISOString();
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
    const paymentReady = this.isEmpresaConvenio || !!this.asignacionForm.medioPago;
    return (
      this.cajaAbierta &&
      this.selectedRoomIsAvailable &&
      !!this.asignacionForm.habitacionId &&
      !!this.asignacionForm.huespedId &&
      this.getCantidadNoches() >= 1 &&
      paymentReady
    );
  }

  get canCheckout() {
    return this.cajaAbierta && this.hasCurrentAssignmentDetails;
  }

  get hasCurrentAssignmentDetails() {
    return !!this.selectedRoom && this.getRoomStatus(this.selectedRoom) === 'OCUPADA' && !!this.selectedRoomAssignment;
  }

  get isSelectedRoomInCleaning() {
    return !!this.selectedRoom && this.getRoomStatus(this.selectedRoom) === 'EN_LIMPIEZA';
  }

  getRoomStatus(room: Habitacion) {
    if (!room.estadoActivo) return 'INACTIVA';
    if (room.estadoOperativo === 'EN_LIMPIEZA') return 'EN_LIMPIEZA';
    if (room.hasActiveAssignmentNow) return 'OCUPADA';
    if (room.hasActiveReservationNow) return 'RESERVADA';
    return this.availableRoomIds.has(room.id) ? 'DISPONIBLE' : 'OCUPADA';
  }

  getRoomFill(room: Habitacion) {
    const status = this.getRoomStatus(room);
    if (status === 'INACTIVA') return '#e2e8f0';
    if (status === 'EN_LIMPIEZA') return '#93c5fd';
    if (status === 'RESERVADA') return '#c4b5fd';
    if (status === 'DISPONIBLE') return '#bbf7d0';
    return '#fed7aa';
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

  @HostListener('document:mousedown', ['$event'])
  onDocumentMouseDown(event: MouseEvent) {
    if (!this.errorMsg && !this.successMsg) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest('[data-toast-message]')) return;
    this.clearMessages();
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

  get isEmpresaConvenio() {
    return !!this.selectedGuest?.empresaHostal;
  }

  get tipoCobroActualLabel() {
    const tipo = this.selectedRoomAssignment?.tipoCobro;
    if (tipo === 'EMPRESA_CONVENIO') return 'Convenio empresa';
    if (tipo === 'DIRECTO') return 'Cobro directo';
    return '-';
  }

  get montoActualLabel() {
    if (!this.selectedRoomAssignment) return '-';
    if (this.selectedRoomAssignment.tipoCobro === 'EMPRESA_CONVENIO') {
      return 'Facturación global empresa';
    }

    const monto = this.selectedRoomAssignment.ventaAlojamiento?.montoTotal;
    if (!monto) return '-';
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(Number(monto));
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
    const ingreso = this.getBusinessDateParts(fechaIngreso);
    const cuentaNocheAnterior = this.isHourInsideNightWindow(ingreso.hour) && ingreso.hour < this.nightEndHour;

    const fechaBase = this.shiftCalendarDate(
      ingreso.year,
      ingreso.month,
      ingreso.day,
      cuentaNocheAnterior ? -1 : 0,
    );
    const fechaCheckout = this.shiftCalendarDate(
      fechaBase.year,
      fechaBase.month,
      fechaBase.day,
      cantidadNoches,
    );

    return this.createBusinessDate(
      fechaCheckout.year,
      fechaCheckout.month,
      fechaCheckout.day,
      this.checkoutHour,
      0,
      0,
    );
  }

  private isHourInsideNightWindow(hour: number) {
    return hour >= this.nightStartHour || hour < this.nightEndHour;
  }

  private getBusinessDateParts(date: Date) {
    const parts = this.businessDateTimeFormatter.formatToParts(date);
    const get = (type: Intl.DateTimeFormatPartTypes) => {
      const value = parts.find((part) => part.type === type)?.value;
      if (!value) {
        throw new Error('No se pudieron interpretar las fechas de alojamiento');
      }
      return Number(value);
    };

    return {
      year: get('year'),
      month: get('month'),
      day: get('day'),
      hour: get('hour'),
      minute: get('minute'),
      second: get('second'),
    };
  }

  private shiftCalendarDate(year: number, month: number, day: number, deltaDays: number) {
    const utc = new Date(Date.UTC(year, month - 1, day));
    utc.setUTCDate(utc.getUTCDate() + deltaDays);
    return {
      year: utc.getUTCFullYear(),
      month: utc.getUTCMonth() + 1,
      day: utc.getUTCDate(),
    };
  }

  private createBusinessDate(
    year: number,
    month: number,
    day: number,
    hour: number,
    minute: number,
    second: number,
  ) {
    const utcBase = Date.UTC(year, month - 1, day, hour, minute, second, 0);
    const firstGuess = new Date(utcBase);
    const offsetMinutes = this.getOffsetMinutesAt(firstGuess);
    const firstResult = new Date(utcBase - offsetMinutes * 60_000);

    const confirmedOffset = this.getOffsetMinutesAt(firstResult);
    if (confirmedOffset === offsetMinutes) {
      return firstResult;
    }

    return new Date(utcBase - confirmedOffset * 60_000);
  }

  private getOffsetMinutesAt(date: Date) {
    const part = this.businessOffsetFormatter
      .formatToParts(date)
      .find((item) => item.type === 'timeZoneName')?.value;

    if (!part) {
      throw new Error('No se pudo resolver zona horaria de negocio');
    }

    if (part === 'GMT' || part === 'UTC') {
      return 0;
    }

    const match = part.match(/^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/);
    if (!match) {
      throw new Error('Formato de zona horaria no soportado');
    }

    const sign = match[1] === '-' ? -1 : 1;
    const hours = Number(match[2]);
    const minutes = Number(match[3] ?? '0');
    return sign * (hours * 60 + minutes);
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

  volver() {
    this.router.navigate(['/pos/caja']);
  }
}
